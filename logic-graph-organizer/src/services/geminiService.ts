import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type {
  Segment,
  GraphNode,
  GraphEdge,
  GeminiExtractResponse,
  GeminiMergeResponse,
} from '../types';
import { chunkSegmentsForAPI } from '../utils/segmentParser';

// JSON Schema for extractGraphFromSegments
const extractGraphSchema = {
  type: SchemaType.OBJECT,
  properties: {
    nodes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          canonicalKey: {
            type: SchemaType.STRING,
            description: '稳定的去重键，使用小写+短横线，如 order-state-machine、user-permission、refund-rule',
          },
          title: {
            type: SchemaType.STRING,
            description: '节点标题，尽量短',
          },
          summary: {
            type: SchemaType.STRING,
            description: '1-2句摘要',
          },
          details: {
            type: SchemaType.STRING,
            description: '必要时补充细节，可为空',
            nullable: true,
          },
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          sourceSegmentIds: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          status: {
            type: SchemaType.STRING,
            enum: ['active', 'deprecated'],
          },
        },
        required: ['canonicalKey', 'title', 'summary', 'tags', 'sourceSegmentIds', 'status'],
      },
    },
    edges: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sourceCanonicalKey: { type: SchemaType.STRING },
          targetCanonicalKey: { type: SchemaType.STRING },
          relationType: {
            type: SchemaType.STRING,
            enum: ['hierarchy', 'dependency', 'reference', 'conflict', 'other'],
          },
          label: {
            type: SchemaType.STRING,
            nullable: true,
          },
        },
        required: ['sourceCanonicalKey', 'targetCanonicalKey', 'relationType'],
      },
    },
    segmentToNodeKeys: {
      type: SchemaType.OBJECT,
      description: '把 segmentId 映射到若干 canonicalKey',
    },
    warnings: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      nullable: true,
    },
  },
  required: ['nodes', 'edges', 'segmentToNodeKeys'],
};

// JSON Schema for mergeAndRefineGraph
const mergeGraphSchema = {
  type: SchemaType.OBJECT,
  properties: {
    nodes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          canonicalKey: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          details: { type: SchemaType.STRING, nullable: true },
          tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          sourceSegmentIds: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          status: { type: SchemaType.STRING, enum: ['active', 'deprecated'] },
        },
        required: ['canonicalKey', 'title', 'summary', 'tags', 'sourceSegmentIds', 'status'],
      },
    },
    edges: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sourceCanonicalKey: { type: SchemaType.STRING },
          targetCanonicalKey: { type: SchemaType.STRING },
          relationType: {
            type: SchemaType.STRING,
            enum: ['hierarchy', 'dependency', 'reference', 'conflict', 'other'],
          },
          label: { type: SchemaType.STRING, nullable: true },
        },
        required: ['sourceCanonicalKey', 'targetCanonicalKey', 'relationType'],
      },
    },
    mergedKeys: {
      type: SchemaType.OBJECT,
      description: '旧 canonicalKey 到新 canonicalKey 的映射（仅当发生合并时）',
    },
    warnings: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      nullable: true,
    },
  },
  required: ['nodes', 'edges', 'mergedKeys'],
};

class GeminiService {
  private apiKey: string | null = null;
  private genAI: GoogleGenerativeAI | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
    this.genAI = new GoogleGenerativeAI(key);
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Extract graph nodes and edges from segments
   */
  async extractGraphFromSegments(
    segments: Segment[],
    existingNodes?: GraphNode[],
    existingEdges?: GraphEdge[],
    onProgress?: (message: string) => void
  ): Promise<GeminiExtractResponse> {
    if (!this.genAI) {
      throw new Error('请先配置 Gemini API Key');
    }

    // Chunk segments if too large
    const chunks = chunkSegmentsForAPI(segments);

    if (chunks.length > 1) {
      onProgress?.(`文本较长，将分 ${chunks.length} 批处理...`);
    }

    let allNodes: GeminiExtractResponse['nodes'] = [];
    let allEdges: GeminiExtractResponse['edges'] = [];
    let allSegmentToNodeKeys: Record<string, string[]> = {};
    let allWarnings: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      onProgress?.(`处理第 ${i + 1}/${chunks.length} 批...`);

      const result = await this.extractSingleBatch(chunk, existingNodes, existingEdges);

      // Merge results
      allNodes = [...allNodes, ...result.nodes];
      allEdges = [...allEdges, ...result.edges];
      allSegmentToNodeKeys = { ...allSegmentToNodeKeys, ...result.segmentToNodeKeys };
      if (result.warnings) {
        allWarnings = [...allWarnings, ...result.warnings];
      }
    }

    // Deduplicate nodes by canonicalKey
    const nodeMap = new Map<string, GeminiExtractResponse['nodes'][0]>();
    allNodes.forEach(node => {
      const existing = nodeMap.get(node.canonicalKey);
      if (existing) {
        // Merge
        existing.tags = [...new Set([...existing.tags, ...node.tags])];
        existing.sourceSegmentIds = [...new Set([...existing.sourceSegmentIds, ...node.sourceSegmentIds])];
        if (node.summary.length > existing.summary.length) {
          existing.summary = node.summary;
        }
        if (node.details && (!existing.details || node.details.length > existing.details.length)) {
          existing.details = node.details;
        }
      } else {
        nodeMap.set(node.canonicalKey, { ...node });
      }
    });

    // Deduplicate edges
    const edgeSet = new Set<string>();
    const uniqueEdges = allEdges.filter(edge => {
      const key = `${edge.sourceCanonicalKey}->${edge.targetCanonicalKey}`;
      if (edgeSet.has(key)) return false;
      edgeSet.add(key);
      return true;
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: uniqueEdges,
      segmentToNodeKeys: allSegmentToNodeKeys,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    };
  }

  private async extractSingleBatch(
    segments: Segment[],
    existingNodes?: GraphNode[],
    _existingEdges?: GraphEdge[]
  ): Promise<GeminiExtractResponse> {
    const model = this.genAI!.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: extractGraphSchema,
      },
    });

    // Build prompt
    const segmentsText = segments.map(s =>
      `[片段ID: ${s.id}]\n${s.text}\n---`
    ).join('\n');

    let existingContext = '';
    if (existingNodes && existingNodes.length > 0) {
      existingContext = `\n\n已有节点（请避免重复创建相似节点，使用相同的 canonicalKey 来合并）：\n${
        existingNodes.map(n => `- ${n.canonicalKey}: ${n.title}`).join('\n')
      }`;
    }

    const prompt = `你是一个业务逻辑分析专家。请分析以下业务文本片段，提取出关键的业务概念、规则、状态、流程等，生成结构化的知识图谱节点和关系。

要求：
1. 每个独立的业务概念/规则/状态/流程应该成为一个节点
2. canonicalKey 使用小写英文+短横线，要稳定且有意义（如 order-state-machine, user-permission）
3. 识别节点之间的关系：
   - hierarchy: 父子/包含关系
   - dependency: 依赖关系（A 依赖 B）
   - reference: 引用关系
   - conflict: 冲突/矛盾（不同版本的说法相互矛盾）
   - other: 其他关系
4. 如果发现某些内容明显过期或被新版本否定，将其 status 设为 deprecated，并在 warnings 中说明原因
5. sourceSegmentIds 必须准确填写，表示该节点的信息来源于哪些片段
6. 每个片段可能对应多个节点，每个节点也可能由多个片段支持
${existingContext}

待分析的文本片段：
${segmentsText}

请按照指定的 JSON Schema 格式输出。`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    try {
      return JSON.parse(text) as GeminiExtractResponse;
    } catch {
      throw new Error('AI 返回的数据格式有误，请重试');
    }
  }

  /**
   * Merge and refine existing graph (remove duplicates, fix relationships)
   */
  async mergeAndRefineGraph(
    nodes: GraphNode[],
    edges: GraphEdge[],
    onProgress?: (message: string) => void
  ): Promise<GeminiMergeResponse> {
    if (!this.genAI) {
      throw new Error('请先配置 Gemini API Key');
    }

    onProgress?.('正在分析图结构...');

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: mergeGraphSchema,
      },
    });

    const nodesText = nodes.map(n =>
      `[${n.canonicalKey}] ${n.title}\n摘要: ${n.summary}\n标签: ${n.tags.join(', ')}\n状态: ${n.status}`
    ).join('\n\n');

    const edgesText = edges.map(e => {
      const sourceNode = nodes.find(n => n.id === e.source);
      const targetNode = nodes.find(n => n.id === e.target);
      return `${sourceNode?.canonicalKey || e.source} -[${e.relationType}]-> ${targetNode?.canonicalKey || e.target}`;
    }).join('\n');

    const prompt = `你是一个知识图谱优化专家。请分析以下业务知识图谱，进行优化：

1. 合并重复/相似的节点（合并后保留更完整的信息，记录在 mergedKeys 中）
2. 修复错误或缺失的关系
3. 标记可能冲突或过期的内容（status 设为 deprecated）
4. 提供优化建议（放入 warnings）

当前节点：
${nodesText}

当前关系：
${edgesText}

请输出优化后的图结构。如果某些节点被合并，请在 mergedKeys 中记录映射关系（旧key -> 新key）。`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    try {
      return JSON.parse(text) as GeminiMergeResponse;
    } catch {
      throw new Error('AI 返回的数据格式有误，请重试');
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
