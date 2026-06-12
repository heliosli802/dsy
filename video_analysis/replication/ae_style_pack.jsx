/*
  阿Test正经比比风格 · AE 动画预设包 v1.0
  ============================================
  用法（二选一）：
  A. AE 菜单【文件 > 脚本 > 运行脚本文件…】选择本文件 → 弹出工具面板
  B. 把本文件放进 AE 安装目录 Scripts/ScriptUI Panels/ 下，重启 AE，
     在【窗口】菜单底部勾选，即成为可停靠面板

  参数来源：对原片 1s/帧 + 8~15fps 放大慢放逐帧拆解的实测值
    pop-in  : 6帧 scale 0→108→100，旋转 -4°→0°
    slam    : 5帧 scale 280→100 + 高斯模糊 30→0，落定接 wiggle
    stamp   : 4帧 scale 300→100，旋转 -8°→0°
    逐字重锤: 文本动画器 缩放280/模糊/不透明0，Start 0→100，每字错开约3帧
    write-on: Trim Paths End 0→100
    计数器  : 滑块表达式 Math.round + 千分位
    抖动保持: posterizeTime(10) + wiggle(2.5, 3)
  兼容：中/英文版 AE（全部使用 matchName，效果重命名后在表达式中引用）
*/
(function (thisObj) {
    var FPS_GUESS = 30;
    var GREEN = [205 / 255, 234 / 255, 74 / 255];
    var DARKBG = [21 / 255, 21 / 255, 21 / 255];
    var WARMWHITE = [241 / 255, 250 / 255, 225 / 255];

    function frames(n, comp) { return n / (comp ? (1 / comp.frameDuration) : FPS_GUESS); }

    function activeComp() {
        var c = app.project.activeItem;
        if (!(c && c instanceof CompItem)) { alert("请先打开/选中一个合成"); return null; }
        return c;
    }
    function selLayers(comp) {
        if (comp.selectedLayers.length === 0) { alert("请先选中至少一个图层"); return []; }
        return comp.selectedLayers;
    }
    function vec(v, prop) { // 按属性维度补齐数组
        var d = prop.value.length;
        var a = [];
        for (var i = 0; i < d; i++) a.push(i < 2 ? v : (prop.value[i] || 100));
        return a;
    }
    function easeKeys(prop, k1, k2) { // 给两个关键帧之间加缓出
        try {
            var dim = (prop.value instanceof Array) ? prop.value.length : 1;
            var eIn = [], eOut = [];
            for (var i = 0; i < dim; i++) { eIn.push(new KeyframeEase(0, 65)); eOut.push(new KeyframeEase(0, 65)); }
            prop.setTemporalEaseAtKey(k1, eIn, eOut);
            prop.setTemporalEaseAtKey(k2, eIn, eOut);
        } catch (e) { /* 单维/旋转等失败时忽略 */ }
    }

    // ---------- 预设 ----------
    function applyPopIn(layer, t, comp) {
        var s = layer.property("ADBE Transform Group").property("ADBE Scale");
        var r = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
        var f = comp.frameDuration;
        s.setValueAtTime(t, vec(0, s));
        s.setValueAtTime(t + 4 * f, vec(108, s));
        s.setValueAtTime(t + 6 * f, vec(100, s));
        easeKeys(s, 1, s.numKeys);
        r.setValueAtTime(t, -4); r.setValueAtTime(t + 6 * f, 0);
    }

    function applySlam(layer, t, comp) {
        var f = comp.frameDuration;
        var s = layer.property("ADBE Transform Group").property("ADBE Scale");
        s.setValueAtTime(t, vec(280, s));
        s.setValueAtTime(t + 5 * f, vec(100, s));
        easeKeys(s, 1, 2);
        var o = layer.property("ADBE Transform Group").property("ADBE Opacity");
        o.setValueAtTime(t, 0); o.setValueAtTime(t + 2 * f, 100);
        try {
            var blur = layer.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
            blur.name = "SLAM模糊";
            var bp = blur.property(1);
            bp.setValueAtTime(t, 30); bp.setValueAtTime(t + 5 * f, 0);
        } catch (e) { }
        applyWiggleHold(layer);
    }

    function applyStamp(layer, t, comp) {
        var f = comp.frameDuration;
        var s = layer.property("ADBE Transform Group").property("ADBE Scale");
        var r = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
        var o = layer.property("ADBE Transform Group").property("ADBE Opacity");
        s.setValueAtTime(t, vec(300, s)); s.setValueAtTime(t + 4 * f, vec(100, s));
        easeKeys(s, 1, 2);
        r.setValueAtTime(t, -8); r.setValueAtTime(t + 4 * f, 0);
        o.setValueAtTime(t, 0); o.setValueAtTime(t + f, 100);
    }

    function applyWiggleHold(layer) {
        var p = layer.property("ADBE Transform Group").property("ADBE Position");
        p.expression = "// 落定呼吸抖动(定格感)\nposterizeTime(10);\nwiggle(2.5, 3);";
    }

    function applyWriteOn(layer, t, comp, durSec) {
        var f = comp.frameDuration;
        var root = layer.property("ADBE Root Vectors Group");
        if (!root) { alert("Write-on 需选中【形状图层】(钢笔画好路径、只描边不填充)"); return; }
        var trim = root.addProperty("ADBE Vector Filter - Trim");
        var end = trim.property("ADBE Vector Trim End");
        end.setValueAtTime(t, 0);
        end.setValueAtTime(t + (durSec || 0.9), 100);
        easeKeys(end, 1, 2);
    }

    function applyCharSlam(layer, t, comp) {
        var f = comp.frameDuration;
        var txt = layer.property("ADBE Text Properties");
        if (!txt) { alert("逐字重锤需选中【文本图层】"); return; }
        var anim = txt.property("ADBE Text Animators").addProperty("ADBE Text Animator");
        anim.name = "逐字重锤";
        var props = anim.property("ADBE Text Animator Properties");
        props.addProperty("ADBE Text Scale 3D").setValue([280, 280, 100]);
        props.addProperty("ADBE Text Opacity").setValue(0);
        try { props.addProperty("ADBE Text Blur").setValue([14, 14]); } catch (e) { }
        var sel = anim.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        var start = sel.property("ADBE Text Percent Start");
        sel.property("ADBE Text Percent End").setValue(100);
        // 每字约3帧: 总时长 = 字数 * 3帧 + 5帧收尾
        var nChar = 5;
        try { nChar = layer.property("ADBE Text Properties").property("ADBE Text Document").value.text.length; } catch (e) { }
        var total = (nChar * 3 + 5) * f;
        start.setValueAtTime(t, 0);
        start.setValueAtTime(t + total, 100);
        applyWiggleHold(layer);
    }

    function makeCounter(comp, t) {
        var layer = comp.layers.addText("0万");
        layer.name = "计数器";
        var doc = layer.property("ADBE Text Properties").property("ADBE Text Document");
        var td = doc.value;
        td.fontSize = 120; td.fillColor = GREEN;
        td.applyStroke = true; td.strokeColor = [0.05, 0.055, 0.03]; td.strokeWidth = 8;
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        try { td.font = "NotoSansCJKsc-Black"; } catch (e) { }
        doc.setValue(td);
        var slider = layer.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
        slider.name = "计数";
        var sp = slider.property(1);
        sp.setValueAtTime(t, 30); sp.setValueAtTime(t + 0.55, 3300);
        easeKeys(sp, 1, 2);
        doc.expression =
            '// 数字滚动计数+千分位\n' +
            'var n = Math.round(effect("计数")(1));\n' +
            'var s = "" + n, r = "";\n' +
            'while (s.length > 3) { r = "," + s.slice(-3) + r; s = s.slice(0, -3); }\n' +
            's + r + "万";';
        // 同步放大
        var sc = layer.property("ADBE Transform Group").property("ADBE Scale");
        sc.setValueAtTime(t, vec(40, sc)); sc.setValueAtTime(t + 0.55, vec(100, sc));
        easeKeys(sc, 1, 2);
        applyWiggleHold(layer);
        return layer;
    }

    // ---------- 示例合成 ----------
    function buildDemoComp() {
        app.beginUndoGroup("生成示例合成");
        try {
            var comp = app.project.items.addComp("阿Test风格_示例", 1920, 1080, 1, 12, 30);
            comp.bgColor = DARKBG;
            comp.openInViewer();
            // 背景
            var bg = comp.layers.addSolid(DARKBG, "纸纹底", 1920, 1080, 1);
            try { var nz = bg.property("ADBE Effect Parade").addProperty("ADBE Noise"); nz.property(1).setValue(6); } catch (e) { }
            // 镜头 Null：所有内容父级到它，反向移动 = 摄像机平移
            var camNull = comp.layers.addNull(12); camNull.name = "镜头_NULL(反向移动)";
            var np = camNull.property("ADBE Transform Group").property("ADBE Position");
            np.setValueAtTime(3.0, [960, 540]); np.setValueAtTime(4.0, [960 - 1400, 540]);
            easeKeys(np, 1, 2);
            np.expression = "// 慢漂移防静死\nvalue + [14 * Math.sin(time * 0.55), 0];";
            // 1. 计数器
            var counter = makeCounter(comp, 0.5);
            counter.property("ADBE Transform Group").property("ADBE Position").expression = "";
            counter.position.setValue([960, 480]); counter.parent = camNull;
            applyWiggleHold(counter);
            // 2. 卡片(白色固态层代替, 实际用拍立得PNG)
            var cardL = comp.layers.addSolid([1, 1, 1], "白边卡片(换成拍立得PNG)", 480, 380, 1);
            cardL.position.setValue([420, 560]); cardL.parent = camNull;
            applyPopIn(cardL, 0.2, comp); applyWiggleHold(cardL);
            // 3. slam 大字
            var slamL = comp.layers.addText("贬值");
            var sd = slamL.property("ADBE Text Properties").property("ADBE Text Document");
            var sv = sd.value; sv.fontSize = 220; sv.fillColor = GREEN;
            sv.applyStroke = true; sv.strokeColor = [0.05, 0.055, 0.03]; sv.strokeWidth = 12;
            sv.justification = ParagraphJustification.CENTER_JUSTIFY; sd.setValue(sv);
            slamL.position.setValue([1500, 380]); slamL.parent = camNull;
            applySlam(slamL, 1.6, comp);
            // 4. 盖章徽章
            var badge = comp.layers.addText("+50%");
            var bd = badge.property("ADBE Text Properties").property("ADBE Text Document");
            var bv = bd.value; bv.fontSize = 90; bv.fillColor = [0.09, 0.09, 0.09];
            bv.justification = ParagraphJustification.CENTER_JUSTIFY; bd.setValue(bv);
            badge.position.setValue([1500, 620]); badge.parent = camNull;
            applyStamp(badge, 2.3, comp);
            // 5. write-on 折线
            var shape = comp.layers.addShape(); shape.name = "手绘箭头(write-on)";
            var grp = shape.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
            var pathGrp = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
            var sh = new Shape();
            sh.vertices = [[-500, 200], [-260, 40], [-120, 110], [240, -160]];
            sh.closed = false;
            pathGrp.property("ADBE Vector Shape").setValue(sh);
            var stroke = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("ADBE Vector Stroke Color").setValue(WARMWHITE);
            stroke.property("ADBE Vector Stroke Width").setValue(14);
            try { stroke.property("ADBE Vector Stroke Line Cap").setValue(2); } catch (e) { }
            shape.position.setValue([2700, 540]); shape.parent = camNull;
            applyWriteOn(shape, 4.2, comp, 0.9);
            // 6. 逐字重锤
            var charL = comp.layers.addText("投资跑步机");
            var cd = charL.property("ADBE Text Properties").property("ADBE Text Document");
            var cv = cd.value; cv.fontSize = 200; cv.fillColor = GREEN;
            cv.applyStroke = true; cv.strokeColor = [0.05, 0.055, 0.03]; cv.strokeWidth = 12;
            cv.justification = ParagraphJustification.CENTER_JUSTIFY; cd.setValue(cv);
            charL.position.setValue([3400, 540]); charL.parent = camNull;
            charL.startTime = 0; applyCharSlam(charL, 5.4, comp);
            alert("示例合成已生成：\n0.2s 卡片pop-in → 0.5s 计数器 → 1.6s 大字slam →\n2.3s 徽章盖章 → 3s 镜头右移 → 4.2s write-on → 5.4s 逐字重锤\n\n再叠：纸纹纹理(叠加10-20%)+颗粒+暗角，配每动作音效");
        } catch (e) { alert("出错(行" + e.line + "): " + e.toString()); }
        app.endUndoGroup();
    }

    function runOnSel(fn, needComp) {
        var comp = activeComp(); if (!comp) return;
        var ls = selLayers(comp); if (!ls.length) return;
        app.beginUndoGroup("风格预设");
        try { for (var i = 0; i < ls.length; i++) fn(ls[i], comp.time + i * 2 * comp.frameDuration, comp); }
        catch (e) { alert("出错(行" + e.line + "): " + e.toString()); }
        app.endUndoGroup();
    }

    // ---------- UI ----------
    function buildUI(thisObj) {
        var pal = (thisObj instanceof Panel) ? thisObj
            : new Window("palette", "阿Test风格动画包", undefined, { resizeable: true });
        var col = pal.add("group"); col.orientation = "column"; col.alignChildren = ["fill", "top"];
        col.add("statictext", undefined, "—— 选中图层后，在当前时间点应用 ——");
        var btns = [
            ["弹入 pop-in (6帧过冲)", function () { runOnSel(applyPopIn); }],
            ["重锤 slam (5帧+模糊+抖动)", function () { runOnSel(applySlam); }],
            ["盖章 stamp (4帧+旋转)", function () { runOnSel(applyStamp); }],
            ["画线 write-on (形状图层)", function () { runOnSel(function (l, t, c) { applyWriteOn(l, t, c, 0.9); }); }],
            ["逐字重锤 (文本图层)", function () { runOnSel(applyCharSlam); }],
            ["落定抖动 wiggle 保持", function () { runOnSel(function (l) { applyWiggleHold(l); }); }],
            ["新建数字计数器", function () { var c = activeComp(); if (c) { app.beginUndoGroup("计数器"); makeCounter(c, c.time); app.endUndoGroup(); } }],
            ["★ 生成完整示例合成", buildDemoComp]
        ];
        for (var i = 0; i < btns.length; i++) {
            (function (b) { col.add("button", undefined, b[0]).onClick = b[1]; })(btns[i]);
        }
        col.add("statictext", undefined, "提示: 多选图层=自动按2帧间隔错峰(级联)");
        if (pal instanceof Window) { pal.center(); pal.show(); }
        else { pal.layout.layout(true); }
        return pal;
    }
    buildUI(thisObj);
})(this);
