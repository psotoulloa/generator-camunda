package <%= applicationPackage %>;

import org.camunda.bpm.application.ProcessApplication;
import org.camunda.bpm.application.impl.ServletProcessApplication;

@ProcessApplication("<%=applicationName%>")
public class <%=applicationClassName%> extends ServletProcessApplication {
  // empty implementation
}
