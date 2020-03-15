import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class DefaultProfileImage {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({type: 'bytea'})
    image!: Buffer; 
}
