import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Background {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({type: 'bytea'})
    image!: Buffer; 
}
