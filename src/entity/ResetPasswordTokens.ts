import {Entity, PrimaryColumn, Column} from "typeorm";
// import { Users } from "./Users";

@Entity()
export class ResetPasswordTokens {
    @PrimaryColumn()
    tokenId!: string

    @Column()
    email!: string

    @Column('timestamp with time zone')
    createdAt!: string;

}