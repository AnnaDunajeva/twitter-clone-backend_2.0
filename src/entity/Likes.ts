import {Entity, ManyToOne, PrimaryColumn, JoinColumn, Column} from "typeorm";
import { Tweets } from "./Tweets";
import { Users } from "./Users";

@Entity()
export class Likes {

    // @PrimaryGeneratedColumn()
    // id!: number;

    @PrimaryColumn()
    tweetId!: number

    @PrimaryColumn()
    userId!: string

    @Column('timestamp with time zone')
    createdAt!: string; 

    @Column({nullable: true, type: 'timestamp with time zone'})
    deletedAt!: string | null;

    @ManyToOne(() => Tweets, tweets => tweets.likes)
    @JoinColumn({name: 'tweetId'})
    tweet!: string;

    @ManyToOne(() => Users)
    @JoinColumn({name: 'userId'})
    user!: string;

}