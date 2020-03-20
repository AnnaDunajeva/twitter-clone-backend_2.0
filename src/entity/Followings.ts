import {Entity, ManyToOne, PrimaryColumn, JoinColumn, Column} from "typeorm";
import { Users } from "./Users";

@Entity()
export class Followings {

    @PrimaryColumn()
    userId!: string

    @PrimaryColumn()
    followingId!: string

    @Column('timestamp with time zone')
    createdAt!: string; 

    @Column({nullable: true, type: 'timestamp with time zone'})
    deletedAt!: string | null;

    @ManyToOne(() => Users, users => users.followings)
    @JoinColumn({name: 'userId'})
    user!: string;

    @ManyToOne(() => Users)
    @JoinColumn({name: 'followingId'})
    following!: string;

}