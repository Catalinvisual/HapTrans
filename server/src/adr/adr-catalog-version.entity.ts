import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AdrCatalogItem } from './adr-catalog-item.entity';

@Entity('adr_catalog_versions')
export class AdrCatalogVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  edition: string; // e.g. "ADR 2025"

  @Column({ nullable: true })
  versionNumber: string; // e.g. "2025.1.0"

  @Column({ type: 'date', nullable: true })
  effectiveDate: Date; // e.g. "2025-01-01"

  @Column({ default: 'UNECE Dangerous Goods List (Table A Chapter 3.2)' })
  sourceDocument: string;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ nullable: true })
  sourceFile: string;

  @Column({ nullable: true })
  fileHash: string; // SHA-256 hash of the dataset source

  @Column({ type: 'int', default: 0 })
  totalEntries: number;

  @Column({ type: 'int', default: 0 })
  rejectedEntries: number;

  @Column({ type: 'text', nullable: true })
  importNotes: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @OneToMany(() => AdrCatalogItem, (item) => item.version)
  items: AdrCatalogItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
