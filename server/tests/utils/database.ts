import { DataSource, type DataSourceOptions } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'
import * as entities from '@server/entities'

export async function createTestDatabase(): Promise<DataSource> {
  const testDataSourceOptions: DataSourceOptions = {
    type: 'better-sqlite3',
    database: ':memory:',
    entities: Object.values(entities),
    synchronize: true,
    namingStrategy: new SnakeNamingStrategy(),
    logging: false,
    migrations: [],
    subscribers: [],
    dropSchema: true,
  }

  const db: DataSource = new DataSource(testDataSourceOptions)

  await db.initialize()

  return db
}

export function createMockDatabase(repositories: any) {
  return {
    getRepository: (entity: any) => {
      if (!(entity.name in repositories)) {
        throw new Error(
          `Repository for ${entity.name} was not found. Did you forget to mock it?`
        )
      }
      return repositories[entity.name]
    },
  } as any
}
