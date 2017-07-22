package <%=package_user%>;

import java.util.HashMap;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.JsonNode;
import com.mashape.unirest.http.Unirest;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.camunda.bpm.engine.variable.Variables;

public class <%=class_name%> implements JavaDelegate {

	public void execute(DelegateExecution execution) throws Exception {
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

		HttpResponse<JsonNode> response1 = Unirest.get(url+"<%=url%>").
				header("accept",  "application/json").
				header("token",(String)data.get("token")).
				asJson();
		Map<String,String> map = new HashMap<String,String>();

		JSONArray data1 = (JSONArray)response1.getBody().getArray();
		int size = data1.length();
		for (int i = 0; i < size ; i++){
			JSONObject item = data1.getJSONObject(i);
			map.put((String)item.get("id"),(String)item.get("name"));
		}
    execution.setVariable("<%=variable_name%>", Variables.objectValue(map).serializationDataFormat("application/json").create());
	}

}
