/* eslint-disable max-classes-per-file */
import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  ManyToOne,
  RelationOptions,
  JoinColumn,
  OneToOne,
  OneOrMore,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('files')
export class Files {
  constructor(id?: string, name?: string) {
    this.id = id || uuidv4();
    this.name = name;
  }

  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column()
  path!: string;

  @Column()
  size!: number;

  @Column()
  type!: string;

  @Column()
  createdAt!: Date;

  @Column({ nullable: true })
  chatId?: string;
}
