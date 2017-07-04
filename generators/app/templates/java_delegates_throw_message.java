package <%= delegate_package %>;

import java.util.HashMap;
import java.util.Map;

import org.camunda.bpm.engine.IdentityService;
import org.camunda.bpm.engine.ProcessEngine;
import org.camunda.bpm.engine.ProcessEngines;
import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;


public class <%= delegate_class_name%> implements JavaDelegate {

	public void execute(DelegateExecution execution) throws Exception {

		ProcessEngine processEngine = ProcessEngines.getDefaultProcessEngine();
		IdentityService identityService = processEngine.getIdentityService();
    RuntimeService runtimeService = execution.getProcessEngineServices().getRuntimeService();

		Map<String, Object> processVariables = new HashMap<String,Object>();

    <% for(var i=0; i<variables.length; i++) { %>
    processVariables.put("<%= variables[i]%>", execution.getVariable("<%= variables[i]%>"));
    <% } %>
    processVariables.put("<%= process_id_name %>", execution.getProcessInstanceId());


		runtimeService.createMessageCorrelation("<%=message_destination_name%>")<% if (!is_start_event){%>
			.processInstanceId(execution.getVariable("<%=id_instancia_a_ejecutar%>").toString())<%}%>
			.setVariables(processVariables).correlate();
	}

}


