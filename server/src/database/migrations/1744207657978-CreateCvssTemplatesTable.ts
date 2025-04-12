import { MigrationInterface, QueryRunner } from 'typeorm'

export class Migration1744207657978 implements MigrationInterface {
  name = 'Migration1744207657978'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cvss_templates" ("id" SERIAL NOT NULL, "version" character varying(10) NOT NULL, "metric_key" character varying(50) NOT NULL, "value_key" character varying(10) NOT NULL, "metric_name" character varying(100) NOT NULL, "value_name" character varying(100) NOT NULL, "official_description" text NOT NULL, "simplified_description" text, CONSTRAINT "PK_6dd1db4004de8c4d1c38636349d" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cvss_template_unique" ON "cvss_templates" ("version", "metric_key", "value_key") `
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_cvss_template_unique"`)
    await queryRunner.query(`DROP TABLE "cvss_templates"`)
  }
}
