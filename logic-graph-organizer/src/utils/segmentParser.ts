import { v4 as uuidv4 } from 'uuid';
import type { Segment } from '../types';

interface ParseOptions {
  splitOnEmptyLines?: boolean;
  splitOnHeaders?: boolean;
  splitOnNumberedLists?: boolean;
  splitOnBulletPoints?: boolean;
  minSegmentLength?: number;
}

const defaultOptions: ParseOptions = {
  splitOnEmptyLines: true,
  splitOnHeaders: true,
  splitOnNumberedLists: true,
  splitOnBulletPoints: true,
  minSegmentLength: 10,
};

/**
 * Parse raw text into segments based on various delimiters and patterns
 */
export function parseTextToSegments(
  text: string,
  options: ParseOptions = {}
): Segment[] {
  const opts = { ...defaultOptions, ...options };
  const segments: Segment[] = [];

  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split strategies
  let chunks: string[] = [normalizedText];

  // 1. Split by markdown headers (# ## ### etc.)
  if (opts.splitOnHeaders) {
    chunks = chunks.flatMap((chunk) => {
      return chunk.split(/(?=^#{1,6}\s+)/m).filter(Boolean);
    });
  }

  // 2. Split by empty lines (paragraphs)
  if (opts.splitOnEmptyLines) {
    chunks = chunks.flatMap((chunk) => {
      // Split on 2+ consecutive newlines
      return chunk.split(/\n{2,}/).filter(Boolean);
    });
  }

  // 3. Split by numbered lists (1. 2. 3. or 1) 2) 3))
  if (opts.splitOnNumberedLists) {
    chunks = chunks.flatMap((chunk) => {
      // Check if chunk contains numbered list items
      if (/^\s*\d+[\.\)]\s+/m.test(chunk)) {
        return chunk.split(/(?=^\s*\d+[\.\)]\s+)/m).filter(Boolean);
      }
      return [chunk];
    });
  }

  // 4. Split by bullet points (- * •)
  if (opts.splitOnBulletPoints) {
    chunks = chunks.flatMap((chunk) => {
      // Check if chunk contains bullet points
      if (/^\s*[-*•]\s+/m.test(chunk)) {
        return chunk.split(/(?=^\s*[-*•]\s+)/m).filter(Boolean);
      }
      return [chunk];
    });
  }

  // Create segments from chunks
  chunks.forEach((chunk) => {
    const trimmedChunk = chunk.trim();
    if (trimmedChunk.length >= (opts.minSegmentLength || 10)) {
      segments.push({
        id: uuidv4(),
        text: trimmedChunk,
        meta: {
          tags: detectTags(trimmedChunk),
        },
        selected: false,
      });
    }
  });

  return segments;
}

/**
 * Detect potential tags from segment content
 */
function detectTags(text: string): string[] {
  const tags: string[] = [];

  // Detect if it's a header
  if (/^#{1,6}\s+/.test(text)) {
    tags.push('标题');
  }

  // Detect if it mentions specific keywords
  const keywordMap: Record<string, string[]> = {
    '状态': ['状态', '状态机', 'state', 'status'],
    '流程': ['流程', '步骤', 'flow', 'process', 'workflow'],
    '规则': ['规则', '条件', 'rule', 'condition', '必须', '不能', '禁止'],
    '权限': ['权限', '角色', 'permission', 'role', 'admin', '管理员'],
    '接口': ['API', '接口', 'endpoint', '请求', '响应'],
    '数据': ['数据', '字段', '表', 'data', 'field', 'table', '数据库'],
    '异常': ['异常', '错误', '失败', 'error', 'exception', 'fail'],
    '配置': ['配置', '参数', 'config', 'setting', 'option'],
  };

  const lowerText = text.toLowerCase();
  for (const [tag, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      tags.push(tag);
    }
  }

  return tags;
}

/**
 * Detect if text looks like it has version info
 */
export function detectVersionInfo(text: string): string | undefined {
  // Common version patterns
  const patterns = [
    /v(\d+\.?\d*\.?\d*)/i,
    /版本\s*[:：]?\s*(\d+\.?\d*\.?\d*)/,
    /version\s*[:：]?\s*(\d+\.?\d*\.?\d*)/i,
    /V(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Detect if text contains date info
 */
export function detectDateInfo(text: string): string | undefined {
  // Common date patterns
  const patterns = [
    /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,
    /(\d{4}年\d{1,2}月)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Smart merge of two segments
 */
export function mergeSegments(seg1: Segment, seg2: Segment): Segment {
  return {
    id: uuidv4(),
    text: `${seg1.text}\n\n${seg2.text}`,
    meta: {
      tags: [...new Set([...(seg1.meta.tags || []), ...(seg2.meta.tags || [])])],
      version: seg1.meta.version || seg2.meta.version,
      source: seg1.meta.source || seg2.meta.source,
      date: seg1.meta.date || seg2.meta.date,
    },
    selected: false,
  };
}

/**
 * Estimate token count for text (rough approximation)
 * Chinese characters: ~1.5 tokens each
 * English words: ~1 token each
 */
export function estimateTokenCount(text: string): number {
  // Count Chinese characters
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  // Count English words
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  // Count numbers
  const numbers = (text.match(/\d+/g) || []).length;

  return Math.ceil(chineseChars * 1.5 + englishWords + numbers * 0.5);
}

/**
 * Chunk segments for API calls based on token limit
 */
export function chunkSegmentsForAPI(
  segments: Segment[],
  maxTokensPerChunk: number = 8000
): Segment[][] {
  const chunks: Segment[][] = [];
  let currentChunk: Segment[] = [];
  let currentTokenCount = 0;

  for (const segment of segments) {
    const segmentTokens = estimateTokenCount(segment.text);

    if (currentTokenCount + segmentTokens > maxTokensPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokenCount = 0;
    }

    currentChunk.push(segment);
    currentTokenCount += segmentTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
