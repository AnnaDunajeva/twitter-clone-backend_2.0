import {Entity, ManyToOne, PrimaryColumn, JoinColumn, Column} from "typeorm";
import { Users } from "./Users";

@Entity()
export class Tokens {
    @PrimaryColumn()
    tokenId!: string

    @Column()
    userId!: string

    @ManyToOne(() => Users, users => users.tokens)
    @JoinColumn({name: 'userId'})
    user!: string;

}