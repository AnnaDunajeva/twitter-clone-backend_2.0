import {MigrationInterface, QueryRunner} from "typeorm";
import * as fs from 'fs'
import * as path from 'path';

export class AddMainPageBackground1592575769407 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        const bg = fs.readFileSync(path.join(__dirname, '../../assets/twitter-bg-2-small.jpg'))
        queryRunner.query(`insert into background(image) values(decode('${bg.toString('hex')}', 'hex'));`)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
    }

}
