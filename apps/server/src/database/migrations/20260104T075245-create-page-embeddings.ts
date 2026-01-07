import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create pgvector extension if it doesn't exist
  await sql`CREATE EXTENSION IF NOT EXISTS vector`.execute(db);

  // Create page_embeddings table
  await db.schema
    .createTable('page_embeddings')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('page_id', 'uuid', (col) =>
      col.references('pages.id').onDelete('cascade').notNull(),
    )
    .addColumn('space_id', 'uuid', (col) =>
      col.references('spaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('attachment_id', 'uuid', (col) =>
      col.references('attachments.id').onDelete('cascade'),
    )
    .addColumn('model_name', 'varchar', (col) => col.notNull())
    .addColumn('model_dimensions', 'integer', (col) => col.notNull())
    .addColumn('embedding', sql`vector(1536)`, (col) => col.notNull())
    .addColumn('chunk_index', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('chunk_start', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('chunk_length', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('metadata', 'jsonb', (col) => col.defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('deleted_at', 'timestamptz', (col) => col)
    .execute();

  // Create indexes for better query performance
  await db.schema
    .createIndex('page_embeddings_page_id_idx')
    .on('page_embeddings')
    .column('page_id')
    .execute();

  await db.schema
    .createIndex('page_embeddings_workspace_id_idx')
    .on('page_embeddings')
    .column('workspace_id')
    .execute();

  await db.schema
    .createIndex('page_embeddings_space_id_idx')
    .on('page_embeddings')
    .column('space_id')
    .execute();

  // Create vector similarity search index using HNSW
  await sql`
    CREATE INDEX IF NOT EXISTS page_embeddings_embedding_idx 
    ON page_embeddings 
    USING hnsw (embedding vector_cosine_ops)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('page_embeddings').execute();
  // Note: We don't drop the vector extension as it might be used by other tables
}

