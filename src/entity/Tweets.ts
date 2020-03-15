import {Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, JoinColumn} from "typeorm";
import { Likes } from "./Likes";

//should i add status column? then when person deletes tweet i can for example nullify all data and set status to deleted
//i guess i still can store all the likes, i just wont retrive them for status deleted tweets
//what about replies? I guess if parent has deleted status, i just set parentid to deleted

@Entity()
export class Tweets {

    @PrimaryGeneratedColumn()
    tweetId!: number;

    @Column()
    userId!: string;

    @Column()
    text!: string;

    @Column('timestamp with time zone')
    createdAt!: string;
    
    //@Column({nullable: true, type: "varchar" }) //Otherwise, TypeORM can't guess that type correctly (assumes Object) and Results in Data type "Object" in "Article.title" is not supported by "postgres".
    @Column({nullable: true, type: "bigint" }) 
    parentId!: number | null;

    @Column({nullable: true, type: 'bytea'})
    media!: Buffer | null;

    @OneToMany(() => Likes, likes => likes.tweet) //cascade?
    likes!: Likes[];

    @OneToMany(() => Tweets, tweets => tweets.parent) 
    replies!: Tweets[];

    @ManyToOne(() => Tweets, tweets => tweets.replies) 
    @JoinColumn({name: 'parentId'})
    parent!: string;
}