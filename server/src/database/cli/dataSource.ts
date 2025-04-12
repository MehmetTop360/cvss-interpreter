import config from '@server/config'
import { CvssTemplate } from '@server/entities/CvssTemplate.entity'
import { createDatabase } from '..'

const cliDataSourceOptions = {
  ...config.database,
  entities: [CvssTemplate],
  migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
}

export const migrationDatasource = createDatabase(cliDataSourceOptions as any)
