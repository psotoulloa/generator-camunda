package <%=package_user%>;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.camunda.bpm.engine.IdentityService;
import org.camunda.bpm.engine.ProcessEngine;
import org.camunda.bpm.engine.ProcessEngines;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.camunda.bpm.engine.identity.User;
import org.camunda.bpm.engine.variable.Variables;

public class <%=class_name%> implements JavaDelegate {

	public void execute(DelegateExecution execution) throws Exception {
		ProcessEngine processEngine = ProcessEngines.getDefaultProcessEngine();
		IdentityService identityService = processEngine.getIdentityService();
		List<User> users = identityService.createUserQuery().memberOfGroup("<%=group%>").list();
		Map<String, String> hashMapUsers = new HashMap<String, String>();

		int size = users.size();
		for (int i = 0; i < size; i++) {
			User user = users.get(i);
			hashMapUsers.put(user.getId(),user.getFirstName() + " " + user.getLastName());
		}
    execution.setVariable("<%=variable_name%>", Variables.objectValue(hashMapUsers).serializationDataFormat("application/json").create());
	}

}
