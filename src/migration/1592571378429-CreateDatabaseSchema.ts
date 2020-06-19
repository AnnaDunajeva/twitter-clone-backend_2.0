import {MigrationInterface, QueryRunner} from "typeorm";
import * as fs from 'fs';
import * as path from 'path';

export class CreateDatabaseSchema1592571378429 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        const dbSchema = fs.readFileSync(path.join(__dirname, '../../assets/database_schema.sql')).toString()
        await queryRunner.query(dbSchema)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP schema public`)
    }

}
