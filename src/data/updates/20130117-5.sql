alter table sprints modify guild varchar(255) not null,
add index sprints_guild_index (guild) ;