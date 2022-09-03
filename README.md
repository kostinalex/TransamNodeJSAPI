This api has the following endpoints:

1) login: the endpoint accepts the username and password from a user, makes validation against the MySql database, extracts data about the user's roles, encodes this info into JWT and returns it to user.

2) getcollectionletters: the endpoint combines data from MySql and MSSQL (3rd party, legacy) databases into report on collection letters. The endpoint is protected by the authorization middleware.

3) 
