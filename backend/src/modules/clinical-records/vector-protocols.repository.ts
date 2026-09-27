import { PrismaClient, Prisma } from '@prisma/client';
import { ProtocolSearchResult, SearchProtocolsOptions } from './clinical-records.types';

export class VectorProtocolsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Converte um array de números em uma string compatível com o formato do pgvector: "[0.0123,-0.0456,...]"
   */
  public static formatVector(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  /**
   * Realiza busca semântica por similaridade de cosseno nos protocolos clínicos cadastrados.
   * Utiliza o operador <=> do pgvector: 1 - (embedding <=> target_vector) representa o cosine similarity.
   */
  public async findSimilarProtocols(
    queryEmbedding: number[],
    options: SearchProtocolsOptions = {}
  ): Promise<ProtocolSearchResult[]> {
    const limit = options.limit ?? 5;
    const minSimilarity = options.minSimilarity ?? 0.65;
    const vectorString = VectorProtocolsRepository.formatVector(queryEmbedding);

    // Query segura com o Prisma.$queryRaw aproveitando índices HNSW ou IVFFlat do pgvector
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        specialization: string;
        title: string;
        target_condition: string;
        description: string;
        contraindications: string[];
        indications: string[];
        evidence_level: string | null;
        content: string;
        similarity: number;
      }>
    >`
      SELECT 
        id,
        specialization,
        title,
        target_condition,
        description,
        contraindications,
        indications,
        evidence_level,
        content,
        (1 - (embedding <=> ${vectorString}::vector)) AS similarity
      FROM curated_exercise_protocols
      WHERE embedding IS NOT NULL
        ${options.specialization ? Prisma.sql`AND specialization = ${options.specialization}` : Prisma.empty}
      ORDER BY embedding <=> ${vectorString}::vector ASC
      LIMIT ${limit};
    `;

    return rows
      .filter(row => row.similarity >= minSimilarity)
      .map(row => ({
        id: row.id,
        specialization: row.specialization,
        title: row.title,
        targetCondition: row.target_condition,
        evidenceLevel: row.evidence_level || 'B',
        indications: row.indications || [],
        contraindications: row.contraindications || [],
        content: row.content,
        similarity: Math.round(row.similarity * 1000) / 1000
      }));
  }

  /**
   * Cadastra ou atualiza um protocolo clínico curado com o seu vetor de embedding gerado pela IA.
   */
  public async saveProtocolWithEmbedding(params: {
    specialization: string;
    title: string;
    targetCondition: string;
    description: string;
    contraindications: string[];
    indications: string[];
    evidenceLevel: string;
    content: string;
    embedding: number[];
  }): Promise<string> {
    const vectorString = VectorProtocolsRepository.formatVector(params.embedding);

    const result = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO curated_exercise_protocols (
        id,
        specialization,
        title,
        target_condition,
        description,
        contraindications,
        indications,
        evidence_level,
        content,
        embedding,
        created_at
      ) VALUES (
        gen_random_uuid(),
        ${params.specialization},
        ${params.title},
        ${params.targetCondition},
        ${params.description},
        ${params.contraindications},
        ${params.indications},
        ${params.evidenceLevel},
        ${params.content},
        ${vectorString}::vector,
        NOW()
      )
      RETURNING id;
    `;

    return result[0]?.id;
  }
}
