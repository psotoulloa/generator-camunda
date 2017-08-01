package org.camunda.auth;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.JsonNode;
import com.mashape.unirest.http.Unirest;


public class MiddlewareAuth {

	public static String getToken() throws Exception {
		Map<String, String> env = System.getenv();
		JSONObject body = new JSONObject();
		body.put("appname", env.get("camunda_appname"));
		body.put("password", env.get("camunda_password"));
		String url = env.get("middleware_url");
		HttpResponse<JsonNode> response = Unirest.post(url+"/api2/apps/auth/token").
				header("Content-Type",  "application/json").
				body(body).
				asJson();
		JSONObject data = (JSONObject)response.getBody().getObject();

		return (String)data.get("token");
	}

}
