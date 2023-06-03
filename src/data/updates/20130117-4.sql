create or replace index sprint_users_sprint_user_index
	on sprint_users (sprint, user);
	ALTER Table sprint_users ADD INDEX sprint_users_sprint_user_index (sprint, user);