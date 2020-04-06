import {Entity, PrimaryColumn, Column, OneToMany} from "typeorm";
import {Tokens} from './Tokens'
import {Followings} from './Followings'

//maybe add validFrom column and valid until to track active users...
//but userId is a key... so it mean if user deletes account, another account still cant be created with that username...?

@Entity()
// @Unique(['email'])
export class Users {

    @PrimaryColumn()
    userId!: string;

    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column()
    password!: string;

    @Column()
    email!: string;

    @Column({nullable: true, type: 'timestamp with time zone'})
    verifiedAt!: string | null;

    @Column('timestamp with time zone')
    createdAt!: string;

    @Column({nullable: true, type: 'timestamp with time zone'})
    deletedAt!: string | null;

    @Column({nullable: true, type: 'varchar'})
    description!: string | null;

    @Column({nullable: true, type: 'varchar'})
    location!: string | null;

    @Column({nullable: true, type: 'bytea'})
    avatar!: Buffer | null;

    @Column({nullable: true, type: 'varchar'})
    backgroundColor!: string | null;

    @Column({nullable: true, type: 'bytea'})
    backgroundImage!: Buffer | null;

    @OneToMany(() => Tokens, tokens => tokens.user)
    tokens!: Tokens[];

    @OneToMany(() => Followings, following => following.user) 
    followings!: Followings[];   

}
