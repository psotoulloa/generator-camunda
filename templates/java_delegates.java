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

	}

}


