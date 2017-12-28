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
The forms can be generated automatically using the elements called extensions in camunda, the format for these is as follows:

Name | Value | Description
------------ | ------------- | -------------
info | {varName} | Load a variable, important, it should only be used if it has not been added as input, if this behavior is necessary, the generated line that loads the variable should be deleted, otherwise camunda will throw error
boolean| {varName} | Generates a checkbox associated with the specified variable
text | {varName} | Generates a text associated with the specified variable
textarea | {varName} | Generates a textarea associated with the specified variable
list:{listNameVariable}@{url} | {varName} | It generates a selector, whose list is loaded from the specified url, the loading process occurs in the start event, then the generator will create a java class in the org.camunda.list package
date | {varName} | Generates a date field associated with the name of the variable
number | {varName} | Generates a Integer field associated with the name of the variable
file | {varName} | Generates a File field associated with the name of the variable

It is possible to specify if a field is required by adding the * character following the specified field type, for example list *: personlist @ / url / middleware

#### Java Delegates

```bash
# yo camunda:javadelegate <service_task_id/intermediate_throw_event_id>
# example:
yo camunda:javadelegate Task_7a43dtk

``` 

### Additional commands
```bash
npm run deploy 

```
Compile the project and place it in the folder ../../weapps, you can change this location to where you think appropriate , file package.json :) 
## TODO LIST 
- User guide
- API Calls 
- Refactor the code 
- Make tests
- Bug javadelegate
### Autor
<img src="https://github.com/psotoulloa.png?size=64" width="64" height="64" alt="psotoulloa">
