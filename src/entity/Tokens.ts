import {Entity, ManyToOne, PrimaryColumn, JoinColumn, Column} from "typeorm";
import { Users } from "./Users";

@Entity()
export class Tokens {
    @PrimaryColumn()
    tokenId!: string

    @Column()
    userId!: string

    // @Column('timestamp with time zone')
    // createdAt!: string;

    @ManyToOne(() => Users, users => users.tokens)
    @JoinColumn({name: 'userId'})
    user!: string;

}