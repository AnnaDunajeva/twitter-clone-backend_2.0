import {Entity, ManyToOne, PrimaryColumn, JoinColumn} from "typeorm";
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

    @ManyToOne(() => Tweets, tweets => tweets.likes)
    @JoinColumn({name: 'tweetId'})
    tweet!: string;

    @ManyToOne(() => Users)
    @JoinColumn({name: 'userId'})
    user!: string;

}