import {MigrationInterface, QueryRunner} from "typeorm";
import * as fs from 'fs';
import * as path from 'path';

export class AddDefaultProfile1592574354007 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        const profile = fs.readFileSync(path.join(__dirname, '../../assets/default_avatar1.png'))
        queryRunner.query(`insert into default_profile_image(image) values(decode('${profile.toString('hex')}', 'hex'));`)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
    }

}
