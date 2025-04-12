import * as fs from 'fs'
import * as path from 'path'
import { DataSource, DataSourceOptions } from 'typeorm'
import config from '../config'
import { CvssTemplate } from '../entities/CvssTemplate.entity'

interface CvssDefinitionInput {
  version: string
  metric_key: string
  value_key: string
  metric_name: string
  value_name: string
  official_description: string
  simplified_description?: string | null
}

async function seedDatabase() {
  console.log('Initializing data source for seeding...')

  const seedDataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    ssl: config.database.ssl,
    entities: [CvssTemplate],
    migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
    synchronize: false,
    logging: config.database.logging,
  }

  const AppDataSource = new DataSource(seedDataSourceOptions)

  let jsonData: string

  try {
    await AppDataSource.initialize()
    console.log('Data source initialized successfully.')

    const repository = AppDataSource.getRepository(CvssTemplate)

    const jsonPath = path.join(__dirname, 'seeds', 'cvss_definitions.json')
    const projectRootJsonPath = path.resolve(
      'src',
      'database',
      'seeds',
      'cvss_definitions.json'
    )

    if (fs.existsSync(jsonPath)) {
      console.log(`Reading from: ${jsonPath}`)
      jsonData = fs.readFileSync(jsonPath, 'utf-8')
    } else if (fs.existsSync(projectRootJsonPath)) {
      console.log(`Reading from: ${projectRootJsonPath}`)
      jsonData = fs.readFileSync(projectRootJsonPath, 'utf-8')
    } else {
      throw new Error(
        `Seed file not found at ${jsonPath} or ${projectRootJsonPath}`
      )
    }

    const definitionsInput: CvssDefinitionInput[] = JSON.parse(jsonData)
    console.log(`Loaded ${definitionsInput.length} definitions from JSON.`)

    if (!Array.isArray(definitionsInput) || definitionsInput.length === 0) {
      throw new Error('Seed file is empty or not a valid JSON array.')
    }

    const templatesToSave = definitionsInput.map((def) => {
      const template = new CvssTemplate()
      template.version = def.version
      template.metric_key = def.metric_key
      template.value_key = def.value_key
      template.metric_name = def.metric_name
      template.value_name = def.value_name
      template.official_description = def.official_description
      template.simplified_description =
        def.simplified_description || def.official_description
      return template
    })

    console.log('Clearing existing data from cvss_templates table...')
    await repository.delete({})
    console.log('Existing data cleared.')

    console.log('Inserting new seed data...')
    await repository.save(templatesToSave, { chunk: 100 })
    console.log(`Seeding complete. ${templatesToSave.length} records inserted.`)
  } catch (error) {
    console.error('Error during database seeding:', error)
    process.exit(1)
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy()
      console.log('Data source connection closed.')
    }
  }
}

seedDatabase()
