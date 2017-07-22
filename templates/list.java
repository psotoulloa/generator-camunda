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
		HttpResponse<JsonNode> response = Unirest.get("http://localhost:1880<%=url%>").
				header("accept",  "application/json").
				asJson();
		Map<String,String> map = new HashMap<String,String>();

		JSONArray data = (JSONArray)response.getBody().getArray();
		int size = data.length();
		for (int i = 0; i < size ; i++){
			JSONObject item = data.getJSONObject(i);
			map.put((String)item.get("id"),(String)item.get("name"));
		}
    execution.setVariable("<%=variable_name%>", Variables.objectValue(map).serializationDataFormat("application/json").create());
	}

}
