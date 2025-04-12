import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'
import { z } from 'zod'
import { validates } from '@server/utils/validation'

export enum CvssVersion {
  V3_1 = '3.1',
  V4_0 = '4.0',
}

@Entity({ name: 'cvss_templates' })
@Index('IDX_cvss_template_unique', ['version', 'metric_key', 'value_key'], {
  unique: true,
})
export class CvssTemplate {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  version: CvssVersion | string

  @Column({ type: 'varchar', length: 50, nullable: false })
  metric_key: string

  @Column({ type: 'varchar', length: 10, nullable: false })
  value_key: string

  @Column({ type: 'varchar', length: 100, nullable: false })
  metric_name: string

  @Column({ type: 'varchar', length: 100, nullable: false })
  value_name: string

  @Column({ type: 'text', nullable: false })
  official_description: string

  @Column({ type: 'text', nullable: true })
  simplified_description: string | null
}

export const cvssTemplateSchema = validates<CvssTemplate>().with({
  id: z.number().int().positive(),

  version: z.string().refine((val) => val === '3.1' || val === '4.0', {
    message: "Version must be '3.1' or '4.0'",
  }),
  metric_key: z.string().max(50),
  value_key: z.string().max(10),
  metric_name: z.string().max(100),
  value_name: z.string().max(100),
  official_description: z.string(),
  simplified_description: z.string().nullable(),
})

export type CvssTemplateBare = CvssTemplate
