Group Authentication
====================

This section contains authentication-related methods to acquire and use an access token (JWT format) with
any and all of the micro-services.  The access token contains the standard JWT claims, plus several single-value
claims.  Authorization-related claims are retrieved from the `userinfo` endpoint.  The expiration of the access
token is based on the Metasys user profile.  The expiration of the refresh token is currently set to 5 hours, which is
the maximum length of the Metasys user session (300 minutes) when not "Never Terminate".  The refresh token has a
sliding expiration and it is allowed multiple uses and is advanced as it is reused.  The API and the parameters are
dictated by the 3rd party component IdentityServer 3, which is an open-source implementation of OAuth2 and OpenId Connect.

## Token Management [/Authentication/LogIn]

This endpoint allows you to retrieve and refresh access tokens which are needed on all other types of calls for authentication purposes.

The `/Authentication/LogIn` has two functions:

1. It is used to login. The act of logging in establishes a session for the specified Metasys user and returns an `access_token` which is used on future requests that will be sent during this session.
1. It is used to extend a session. (All sessions have an expiration time. If you wish to keep the session alive longer - without having to login again - you can use this endpoint to refresh the token)

### Login and Session Extension [POST]

See the two request/response examples in the sidebar. The first shows an example of logging in and retrieving an `access_token`. 
The second shows an example of using the refresh token to extend a session and get a new `access_token`.

+ Request (application/json)

        {"username": "{{username}}", "password": "{{password}}", "domain": ""}

+ Response 200 (application/vnd.metasysapi.v1+json)

    + Body

            {
                "access_token": "eyJ0eXAiOiJMN1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IklFa3FIWUl1bHRlYlFMREVmWDVnMDViY2NxZyIsImtpZCI6IklFa3FIWUl1bHRlYlFMREVmWDVnMDViY2NxZyJ9.eyJpc3MiOiJodHRwczovL2xvY2FsaG9zdC9BUEkuQXV0aGVudGljYXRpb25TZXJ2aWNlIiwiYXVkIjoiaHR0cHM6Ly9sb2NhbGhvc3QvQVBJLkF1dGhlbnRpY2F0aW9uU2VydmljZS9yZXNvdXJjZXMiLCJleHAiOjE1MjU5Njg3NzYsIm5iZiI6MTUyNTk2Njk3NiwiY2xpZW50X2lkIjoiTWV0YXN5cyBVSSIsInNjb3BlIjpbIm1ldGFzeXMtdWktYXBpIiwib2ZmbGluZV9hY2Nlc3MiLCJvcGVuaWQiXSwic3ViIjoiNjY0ZGQxZTMtZWE3OS00MTE5LWE5ZjgtNTMzZjJlZTU2OTFjIiwiYXV0aF90aW1lIjoxNTI1OTY2OTc2LCJpZHAiOiJpZHNydiIsIlVzZXJJZCI6IjEiLCJVc2VyTmFtZSI6Im1ldGFzeXNzeXNhZ2VudCIsIklzQWRtaW4iOiJUcnVlIiwiSXNQYXNzd29yZENoYW5nZVJlcXVpcmVkIjoiRmFsc2UiLCJJc1Rlcm1zQW5kQ29uZGl0aW9uc1JlcXVpcmVkIjoiRmFsc2UiLCJJc0xpY2Vuc2VkIjoiVHJ1ZSIsIkN1bHR1cmUiOiJlbi1VUyIsImFtciI6WyJwYXNzd29yZCJdfQ.HHNzOks154CWHG1lqmgq2cOueMFaIUtCbMu4_8bE2O8SdKKeoFKD91WMRUrKbrQ-EUiR7pSbl8HgrLNFaLDNGqFCxQUG7X3Qbc60fSZc-QAcit16pXuvfAdQ16iKTaUE6Wxja9PM_5x0JbvDHm4GghWeUonw5lsWB_iFjFQf23E1eOZAP_dA1ueiza1Uqz-5cQ8l5wylxQNIKevoUTxwb1mBKyEzHARGcThxsWJBW2qwfJUOHnmB67FMBJunHLerFeXpvj3xxobtKbkYVGaf2-kECArRILKEH5HO8MV1Fj4nloVUbL7z7uSfL_nSRDCH0wk8--SCWZW9N1qfMOhijQ",
                "expires_in": 1800,
                "token_type": "Bearer",
                "refresh_token": "a13dc41187f43a38ae0b9153b197fa57"
            }

            + Tests

                    postman.setEnvironmentVariable('access_token', JSON.parse(responseBody).access_token);

    + Attributes (TokenResponse)
