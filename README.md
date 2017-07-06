# Camunda generator
This generator allows to create a new camunda project, the generator use a bpmn file to create the necessary classes for the project works properly 

## Usage

### Instalation
```bash
git clone https://github.com/psotoulloa/generator-camunda.git 
cd generator-camunda 
npm link 

cd <your-awesome-process-folder> 
yo camunda

``` 
Then Yeoman will ask you for your bpmn file, then it will move to the "camunda process folder" (src/main/resources/)

### Sub-Generators
#### Forms
```bash
# yo camunda:form <task_id/start_event_id>
# example:
yo camunda:form Task_1i12yip

``` 
#### Java Delegates

```bash
# yo camunda:javadelegate <service_task_id/intermediate_throw_event_id>
# example:
yo camunda:javadelegate Task_7a43dtk

``` 

## TODO LIST 
- File input
- User guide
- API Calls 
- Refactor the code 
- Make tests

### Autor

<a href="http://www.nekst.me/" target="_blank" title="psotoulloa">
  <img src="https://github.com/psotoulloa.png?size=64" width="64" height="64" alt="psotoulloa">
</a>
