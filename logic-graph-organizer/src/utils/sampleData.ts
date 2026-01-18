export const sampleText = `# 订单系统业务规则 v2.1

## 1. 订单状态流转

订单状态包括：待支付、已支付、待发货、已发货、已完成、已取消、已退款。

状态流转规则：
- 待支付 → 已支付：用户完成支付
- 待支付 → 已取消：超时未支付或用户主动取消
- 已支付 → 待发货：自动流转
- 待发货 → 已发货：商家确认发货
- 已发货 → 已完成：用户确认收货或超时自动确认
- 已支付/待发货/已发货 → 已退款：退款成功

## 2. 权限管理

### 2.1 角色定义
- 超级管理员：拥有所有权限
- 运营人员：可以查看订单、处理客诉、修改商品
- 财务人员：可以查看订单、处理退款、导出报表
- 仓库人员：可以处理发货、查看库存

### 2.2 权限控制（v2.0 版本更新）
旧版本使用的是基于资源的权限控制，新版本改为 RBAC 模型。
注意：旧版本的 permission_list 字段已废弃，请使用 role_permissions 关联表。

## 3. 退款规则

### 3.1 退款条件
- 未发货订单：可以直接退款，无需审核
- 已发货订单：需要用户退回商品，仓库确认后才能退款
- 已完成订单：15天内可申请退款，需要客服审核

### 3.2 退款金额计算
退款金额 = 商品金额 + 运费（仅当全额退款时）- 优惠券抵扣金额

注意：2024年1月后的版本，优惠券抵扣金额不再从退款中扣除，改为标记优惠券为"已使用但订单已退"状态。

## 4. 库存管理

### 4.1 扣减时机
下单时预扣库存，支付成功后正式扣减。
支付超时后，释放预扣库存。

### 4.2 并发控制
使用乐观锁 + Redis 分布式锁双重保障。
旧版本（v1.x）只有数据库乐观锁，高并发时有超卖问题，已修复。

## 5. 通知机制

### 5.1 订单通知
- 下单成功：发送短信+站内信
- 支付成功：发送短信+站内信+邮件
- 发货通知：发送短信+站内信
- 签收提醒：发送站内信

### 5.2 通知模板配置（已废弃）
早期版本的通知模板配置在 config.json 中，现在已经迁移到数据库的 notification_templates 表。

---

以上规则最后更新时间：2024年3月15日
维护人：产品团队`;

export const sampleSegments = [
  {
    id: 'seg-1',
    text: '# 订单系统业务规则 v2.1',
    meta: { tags: ['标题'], version: '2.1' },
    selected: false,
  },
  {
    id: 'seg-2',
    text: '## 1. 订单状态流转\n\n订单状态包括：待支付、已支付、待发货、已发货、已完成、已取消、已退款。',
    meta: { tags: ['标题', '状态'] },
    selected: false,
  },
  {
    id: 'seg-3',
    text: '状态流转规则：\n- 待支付 → 已支付：用户完成支付\n- 待支付 → 已取消：超时未支付或用户主动取消\n- 已支付 → 待发货：自动流转\n- 待发货 → 已发货：商家确认发货\n- 已发货 → 已完成：用户确认收货或超时自动确认\n- 已支付/待发货/已发货 → 已退款：退款成功',
    meta: { tags: ['状态', '流程', '规则'] },
    selected: false,
  },
  {
    id: 'seg-4',
    text: '## 2. 权限管理\n\n### 2.1 角色定义\n- 超级管理员：拥有所有权限\n- 运营人员：可以查看订单、处理客诉、修改商品\n- 财务人员：可以查看订单、处理退款、导出报表\n- 仓库人员：可以处理发货、查看库存',
    meta: { tags: ['标题', '权限'] },
    selected: false,
  },
  {
    id: 'seg-5',
    text: '### 2.2 权限控制（v2.0 版本更新）\n旧版本使用的是基于资源的权限控制，新版本改为 RBAC 模型。\n注意：旧版本的 permission_list 字段已废弃，请使用 role_permissions 关联表。',
    meta: { tags: ['权限', '配置'] },
    selected: false,
  },
  {
    id: 'seg-6',
    text: '## 3. 退款规则\n\n### 3.1 退款条件\n- 未发货订单：可以直接退款，无需审核\n- 已发货订单：需要用户退回商品，仓库确认后才能退款\n- 已完成订单：15天内可申请退款，需要客服审核',
    meta: { tags: ['标题', '规则'] },
    selected: false,
  },
  {
    id: 'seg-7',
    text: '### 3.2 退款金额计算\n退款金额 = 商品金额 + 运费（仅当全额退款时）- 优惠券抵扣金额\n\n注意：2024年1月后的版本，优惠券抵扣金额不再从退款中扣除，改为标记优惠券为"已使用但订单已退"状态。',
    meta: { tags: ['规则', '数据'], date: '2024年1月' },
    selected: false,
  },
  {
    id: 'seg-8',
    text: '## 4. 库存管理\n\n### 4.1 扣减时机\n下单时预扣库存，支付成功后正式扣减。\n支付超时后，释放预扣库存。',
    meta: { tags: ['标题', '流程'] },
    selected: false,
  },
  {
    id: 'seg-9',
    text: '### 4.2 并发控制\n使用乐观锁 + Redis 分布式锁双重保障。\n旧版本（v1.x）只有数据库乐观锁，高并发时有超卖问题，已修复。',
    meta: { tags: ['配置'], version: 'v1.x' },
    selected: false,
  },
  {
    id: 'seg-10',
    text: '## 5. 通知机制\n\n### 5.1 订单通知\n- 下单成功：发送短信+站内信\n- 支付成功：发送短信+站内信+邮件\n- 发货通知：发送短信+站内信\n- 签收提醒：发送站内信',
    meta: { tags: ['标题', '流程'] },
    selected: false,
  },
  {
    id: 'seg-11',
    text: '### 5.2 通知模板配置（已废弃）\n早期版本的通知模板配置在 config.json 中，现在已经迁移到数据库的 notification_templates 表。',
    meta: { tags: ['配置'] },
    selected: false,
  },
];

export const sampleNodes = [
  {
    id: 'node-1',
    title: '订单状态机',
    summary: '订单有7种状态：待支付、已支付、待发货、已发货、已完成、已取消、已退款',
    details: '状态之间有特定的流转规则，主要由用户行为和系统自动触发',
    tags: ['状态', '核心'],
    status: 'active' as const,
    canonicalKey: 'order-state-machine',
    sourceSegmentIds: ['seg-2', 'seg-3'],
    position: { x: 250, y: 100 },
  },
  {
    id: 'node-2',
    title: '角色权限 (RBAC)',
    summary: '系统采用 RBAC 模型，定义了4种角色：超级管理员、运营、财务、仓库',
    details: '新版本使用 role_permissions 关联表',
    tags: ['权限', '核心'],
    status: 'active' as const,
    canonicalKey: 'role-permission-rbac',
    sourceSegmentIds: ['seg-4', 'seg-5'],
    position: { x: 550, y: 100 },
  },
  {
    id: 'node-3',
    title: '退款规则',
    summary: '根据订单状态不同，退款条件和流程有所差异',
    details: '未发货可直接退，已发货需退货，已完成15天内可申请',
    tags: ['规则', '流程'],
    status: 'active' as const,
    canonicalKey: 'refund-rule',
    sourceSegmentIds: ['seg-6', 'seg-7'],
    position: { x: 100, y: 280 },
  },
  {
    id: 'node-4',
    title: '库存扣减机制',
    summary: '下单预扣、支付正式扣减、超时释放',
    details: '使用乐观锁+Redis分布式锁双重保障',
    tags: ['流程', '技术'],
    status: 'active' as const,
    canonicalKey: 'inventory-deduction',
    sourceSegmentIds: ['seg-8', 'seg-9'],
    position: { x: 400, y: 280 },
  },
  {
    id: 'node-5',
    title: '通知机制',
    summary: '订单各阶段的通知策略：短信、站内信、邮件',
    details: '模板配置已迁移到数据库',
    tags: ['流程'],
    status: 'active' as const,
    canonicalKey: 'notification-mechanism',
    sourceSegmentIds: ['seg-10', 'seg-11'],
    position: { x: 700, y: 280 },
  },
  {
    id: 'node-6',
    title: '旧版权限控制',
    summary: '基于资源的权限控制，使用 permission_list 字段',
    details: '已被 RBAC 模型替代',
    tags: ['权限'],
    status: 'deprecated' as const,
    canonicalKey: 'old-permission-control',
    sourceSegmentIds: ['seg-5'],
    position: { x: 550, y: 450 },
  },
  {
    id: 'node-7',
    title: '旧版库存锁',
    summary: 'v1.x版本只有数据库乐观锁，高并发有超卖问题',
    details: '已修复，升级为双重锁机制',
    tags: ['技术'],
    status: 'deprecated' as const,
    canonicalKey: 'old-inventory-lock',
    sourceSegmentIds: ['seg-9'],
    position: { x: 250, y: 450 },
  },
];

export const sampleEdges = [
  {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-3',
    relationType: 'dependency' as const,
    label: '状态决定退款条件',
  },
  {
    id: 'edge-2',
    source: 'node-1',
    target: 'node-4',
    relationType: 'dependency' as const,
    label: '支付状态触发库存变化',
  },
  {
    id: 'edge-3',
    source: 'node-1',
    target: 'node-5',
    relationType: 'dependency' as const,
    label: '状态变化触发通知',
  },
  {
    id: 'edge-4',
    source: 'node-2',
    target: 'node-6',
    relationType: 'conflict' as const,
    label: '新版替代旧版',
  },
  {
    id: 'edge-5',
    source: 'node-4',
    target: 'node-7',
    relationType: 'conflict' as const,
    label: '新版替代旧版',
  },
];
