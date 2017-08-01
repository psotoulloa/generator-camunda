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

import org.camunda.auth.MiddlewareAuth;

public class <%=class_name%> implements JavaDelegate {

	public void execute(DelegateExecution execution) throws Exception {
		HttpResponse<JsonNode> response1 = Unirest.get(System.getenv().get("middleware_url")+"<%=url%>").
				header("accept",  "application/json").
				header("token",MiddlewareAuth.getToken()).
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
