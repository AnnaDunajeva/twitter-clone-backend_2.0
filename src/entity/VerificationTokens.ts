import {Entity, OneToOne, PrimaryColumn, JoinColumn, Column} from "typeorm";
import { Users } from "./Users";

@Entity()
export class VerificationTokens {
    @PrimaryColumn()
    tokenId!: string

    @Column()
    userId!: string

    @Column({nullable: true, type: 'varchar'})
    email!: string

    @Column('timestamp with time zone')
    createdAt!: string;

    @OneToOne(() => Users)
    @JoinColumn({name: 'userId'})
    user!: string;

}