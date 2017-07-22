var chalk = require('chalk');
var Promise = require('promise');
var yosay = require('yosay');
var _ = require('lodash');

/**
 * Return the path to file
 * @param {string} classDefinition
 */
function _get_class_file (classDefinition){
    return 'src/main/java/' + _.replace(classDefinition, /\./g, '/') + ".java";
}

function _add_xmlns_camunda(doc){
  var definitions = doc.getElementsByTagName("bpmn:definitions");
  for (var i=0;i<definitions.length;i++){
    var definition = definitions[i];
    definition.setAttribute("xmlns:camunda","http://camunda.org/schema/1.0/bpmn");
  }
}

/**
 * Add java delegate
 * @param {object} classOptions
 * @param {boolean} triggerMessage
 */
function _add_java_delegates(self,classOptions,triggerMessage){
  if(self.fs.exists(self.destinationPath(_get_class_file(classOptions.name))) && !self.onlyNews){
    if(!triggerMessage){
      self.javaDelegates.push(classOptions.name);
    }else{
      self.javaDelegatesThatEmitsMessages.push(classOptions.name);
    }

    return true;
  }
  if(!self.fs.exists(self.destinationPath(_get_class_file(classOptions.name)))){
    if(!triggerMessage){
      self.javaDelegates.push(classOptions.name);
    }else{
      self.javaDelegatesThatEmitsMessages.push(classOptions.name);
    }
    return true;
  }
  return false;
}
/**
 * Returns class name
 * eg:
 * "org.camunda.test.Class1" return ˝Class1"
 * @param {string} class_definition
 */
function _get_class_name (class_definition){
  var arr = class_definition.split(".");
  if( arr.length-1 >= 0 ){
    return arr[arr.length-1];
  }
  return null;
}
/**
 * Return the package
 * eg:
 * "org.camunda.test.Class1" return "org.camunda.test"
 * @param {string} class_definition
 */
function _get_class_package(class_definition){
  var arr = class_definition.split(".");
  arr.pop();
  return arr.join(".");
}
/**
 * Returns the process archive name
 */
function _get_process_archive(self){
  var arr = self.config.get('bpmFile').split("/");
  arr = arr[arr.length - 1].split(".");
  arr.pop();
  return arr.join(".");
}
/**
 * Agregar un formulario en base a un nodo
 * @param {Generator} self
 * @param {Document} node
 */
function _add_form(self,node){
  var inputs = [];
  var infos = [];
  var extensionElements = node.getElementsByTagName("bpmn:extensionElements");
  if(extensionElements.length>0){
    var camunda_properties = extensionElements[0].getElementsByTagName("camunda:properties");
    if(camunda_properties.length>0){
      var properties = camunda_properties[0].getElementsByTagName("camunda:property");
      for (var k=0;k<properties.length;k++){
        var name = properties[k].getAttribute("name");
        var value = properties[k].getAttribute("value");
        //Información
        if( name == "info"){
          var required = false;
          infos.push({
            name : value
          });
        }
        //Input textarea
        else if( name.startsWith("textarea")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          inputs.push({
            type :"textarea",
            label: _.upperFirst(value),
            name : value,
            required: required
          });
        }
        //Input text
        else if( name.startsWith("text")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          inputs.push({
            type :"text",
            label: _.upperFirst(value),
            name : value,
            required: required
          });
        }
        //Number
        else if( name.startsWith("number")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          inputs.push({
            type :"number",
            label: _.upperFirst(value),
            name : value,
            required: required
          });
        }
        //Input users
        else if( name.startsWith("users")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          name = _.replace(name,"*","");
          var arr = name.split(":");
          if(arr.length==2){
            inputs.push({
              type :"users",
              label: _.upperFirst(value),
              list :arr[1],
              name : value,
              required: required
            });
          }else{
            self.log(chalk.yellow("Warning : users without a list -> '"+name));
            continue;
          }
        }
        //Input list
        else if( name.match("^list([\*]?):([a-zA-Z\_0-9]+)\@((\/[\{]?([a-zA-Z0-9]+)[\}?]?)+)") != null){
          //not the optimal way i know :)
          console.log("asdf");
          var rs = name.match("^list([\*]?):([a-zA-Z\_0-9]+)\@((\/[\{]?([a-zA-Z0-9]+)[\}?]?)+)");
          inputs.push({
            type :"list",
            label: _.upperFirst(value),
            list :rs[2],
            name : value,
            url : rs[3],
            required: (rs[1]=='*')?true:false
          });
        }
        //Input file
        else if( name.startsWith("file")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          name = _.replace(name,"*","");
          var arr = name.split(":");
          if(arr.length==2){
            inputs.push({
              type :"file",
              label: _.upperFirst(value),
              extensions :arr[1],
              name : value,
              required: required
            });
          }else{
            inputs.push({
              type :"file",
              extensions :"*",
              label: _.upperFirst(value),
              name : value,
              required: required
            });
          }
        }
        //Input boolean
        else if( name.startsWith("boolean")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          inputs.push({
            type :"boolean",
            name : value,
            label: _.upperFirst(value),
            required: required
          });
        }
        //Input date
        else if( name.startsWith("date")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          inputs.push({
            type :"date",
            label: _.upperFirst(value),
            name : value,
            required: required
          });
        }
        else{
          self.log(chalk.yellow("Warning :  unknown property '"+name+"'"));
          continue;
        }
      }
    }
  }
  var formKey = node.getAttribute("camunda:formKey");
  if(self.onlyNewsForms){
    if(self.fs.exists(self.destinationPath("src/main/webapp/forms/"+_get_process_archive(self)+"/"+_.camelCase(node.getAttribute("name"))+".html"))){
      return;
    }
  }
  if(formKey == ""){
    self.forms.push({
      formKey : "embedded:app:forms/"+_get_process_archive(self)+"/"+_.camelCase(node.getAttribute("name"))+".html",
      path : "src/main/webapp/forms/"+_get_process_archive(self)+"/"+_.camelCase(node.getAttribute("name"))+".html",
      node : node,
      inputs : inputs,
      infos: infos
    });
  }else{
    var arr = formKey.split(":app:");
    if(arr.length == 2){
      self.forms.push({
        formKey : formKey,
        path : "src/main/webapp/"+arr[1],
        node : node,
        inputs : inputs,
        infos: infos
      });
    }else{
      self.log(chalk.red("Error : formKey mal formed -> '"+formKey));
    }
  }
}

/**
 * This method create the forms and atach them to the bpmn
 */
function _createForms(self,ask){
  if(ask){

    var formsChoices = [];
    var formsChoicesHashs = {};
    //lleno los forms para seleccionarlos
    for (var i =0;i<self.forms.length;i++){
      var form = self.forms[i];
      formsChoicesHashs[form.formKey] = form;
      formsChoices.push({
        name: form.formKey,
        value : form.formKey,
        checked: false
      });
    }
    if(formsChoices.length>0){
      var done = self.async();
      self.prompt([
      {
        type : 'checkbox',
        name : 'forms',
        message : 'Which of these forms do you want to create?:',
        choices : formsChoices
      }]).then(function(answers){
        var forms = [];
        for(var i=0; i<answers['forms'].length ; i++){
          forms.push(formsChoicesHashs[answers['forms'][i]]);
        }
        _create_forms_script(self,forms)
        done();
      });
    }
  }else{
    _create_forms_script(self,self.forms)
  }
}
/**
 * Method tha creates the form scripts
 * @param {Generator} self
 * @param {Array} forms
 */
function _create_forms_script(self,forms){
  for(var i=0;i<forms.length;i++){
    var form = forms[i];
    form.node.setAttribute("camunda:formKey",form.formKey);
    for(var j=0;j<form.inputs.length;j++){
      var input = form.inputs[j];
      if(input.type == 'list'){
        var extensionElements = form.node.getElementsByTagName("bpmn:extensionElements");
        var extensionElement = null;
        if(extensionElements.length==0){
          extensionElement = new DOMParser().parseFromString("<bpmn:extensionElements></bpmn:extensionElements>");
          form.node.appendChild(extensionElement);
        }else{
          extensionElement = extensionElements[0];
        }
        var package_user = "org.camunda.list";
        var class_name = _.upperFirst(input.list);
        var group = input.list;
        var executionListener = self.doc.createElement("camunda:executionListener");
        executionListener.setAttribute("class",package_user+'.'+class_name);
        executionListener.setAttribute("event","start");

        var executionListeners = extensionElement.getElementsByTagName("camunda:executionListener");
        var found = false;
        for(var k=0;k<executionListeners.length;k++){
          if(executionListeners[k].getAttribute("class")==(package_user+'.'+class_name)){
            found = true;
          }
        }
        if(!found){
          extensionElement.appendChild(executionListener);
        }
        /**
        <camunda:executionListener class="org.camunda.list.Developers" event="start" xmlns:camunda=""/>
        <camunda:executionListener class="org.camunda.list.Qas" event="start"/>
          */
        self.fs.copyTpl(
          self.templatePath('list.java'),
          self.destinationPath("src/main/java/org/camunda/list/"+class_name+".java"),
          {
            package_user: package_user,
            class_name: class_name,
            url : input.url,
            group: group,
            variable_name : input.list
          }
        );
      }
    }
    var varsToLoad = [];
    for (var k=0;k<form.inputs.length;k++){
      if(form.inputs[i].type == "list"){
        varsToLoad.push(form.inputs[k].list);
      }
    }
    for (var k=0;k<form.infos.length;k++){
      varsToLoad.push(form.infos[k].name);
    }
    self.fs.copyTpl(
      self.templatePath('form.html'),
      self.destinationPath(form.path),
      {
        inputs: form.inputs,
        infos : form.infos,
        varsToLoad : varsToLoad
      }
    );
  }
}



/**
 * Methot that generate java delegators from an array
 * @param {Generator} self
 * @param {Array} delegates
 */
function _generate_java_delegates_that_emits_messages(self,delegates){
  var java_delegates_no_message = [];
  for (var i = 0; i< delegates.length;i++){
    var node = self.classNodes[delegates[i]];

    if (node.tagName == 'bpmn:intermediateThrowEvent' || node.tagName == 'bpmn:endEvent'){
      var messageEventDefinitions = node.getElementsByTagName("bpmn:messageEventDefinition");
      messageEventDefinitions[0].setAttribute("camunda:class",delegates[i]);
    }else{
      node.setAttribute("camunda:class",delegates[i]);
    }
    var node_id = node.getAttribute("id");
    var collaboration = self.doc.getElementsByTagName('bpmn:collaboration');
    var messageFlows = collaboration[0].getElementsByTagName("bpmn:messageFlow");
    var message_destination_name = "";
    var is_start_event = false;
    var variables = [];
    var id_instancia_a_ejecutar = "";
    var process_id_name = "";
    if(node.parentNode.tagName == "bpmn:laneSet"){
      process_id_name = "INSTANCE_ID_" + node.parentNode.parentNode.getAttribute("id");
    }else{
      process_id_name = "INSTANCE_ID_" + node.parentNode.getAttribute("id");
    }
    //Search and verify target references
    for (var j= 0; j<messageFlows.length ; j++){
      if(messageFlows[j].getAttribute('sourceRef') == node_id){
        var target = self.doc.getElementById(messageFlows[j].getAttribute("targetRef"));
        if (target.tagName == 'bpmn:startEvent'){
          is_start_event = true;
        }
        var messagesEventDefinitions =target.getElementsByTagName("bpmn:messageEventDefinition");
        if (messagesEventDefinitions != undefined && messagesEventDefinitions[0].getAttribute("messageRef") != ""){
          message_destination_name = self.doc.getElementById(messagesEventDefinitions[0].getAttribute("messageRef")).getAttribute("name");
        }else{
          self.log(chalk.red("Error : the event/activity "+target.getAttribute("name")+" doesn't have a message definition"));
          self.log(yosay( chalk.yellow('Sorry, resolve this issue and try again ') ));
          return;
        }
        if (target.parentNode.tagName == "bpmn:laneSet"){
          id_instancia_a_ejecutar = "INSTANCE_ID_" + target.parentNode.parentNode.getAttribute("id");
        }else{
          id_instancia_a_ejecutar = "INSTANCE_ID_" + target.parentNode.getAttribute("id");
        }

      }
    }
    // Processes archives
    var properties = node.getElementsByTagName("camunda:property");
    for (var j = 0;j<properties.length; j++){
      variables.push(properties[j].getAttribute("value"));
    }
    //If no destination message, throw error
    if(message_destination_name == ""){
      //
      self.log(chalk.yellow("Warnign : throw event "+ node.getAttribute("name")+" whit no message flow"));
      java_delegates_no_message.push(delegates[i]);
    }
    //Otherwise we copy the processes.xml
    self.fs.copyTpl(
      self.templatePath('java_delegates_throw_message.java'),
      self.destinationPath(_get_class_file(delegates[i])),
      {
        delegate_package : _get_class_package(delegates[i]) ,
        delegate_class_name : _get_class_name(delegates[i]) ,
        variables : variables,
        message_destination_name : message_destination_name,
        id_instancia_a_ejecutar : id_instancia_a_ejecutar,
        is_start_event : is_start_event,
        process_id_name : process_id_name
      }
    );
  }
  return java_delegates_no_message;
}

function _create_clases(self,javaDelegates,javaDelegatesThatEmitsMessages){
  var delegates_with_no_message_definition = _generate_java_delegates_that_emits_messages(self,javaDelegatesThatEmitsMessages);
  for (var i=0;i< delegates_with_no_message_definition.length;i++){
    javaDelegates.push(delegates_with_no_message_definition[i]);
  }
  //Simple Java Delegates
  for (var i = 0; i < javaDelegates.length;i++){
    self.classNodes[javaDelegates[i]].setAttribute("camunda:class",javaDelegates[i]);
    self.fs.copyTpl(
      self.templatePath('java_delegates.java'),
      self.destinationPath(_get_class_file(javaDelegates[i])),
      {
        delegate_package : _get_class_package(javaDelegates[i]) ,
        delegate_class_name : _get_class_name(javaDelegates[i]) ,
      }
    );
  }
}


module.exports = {
  "generate_java_delegates_that_emites_messages" : _generate_java_delegates_that_emits_messages,
  "create_clases" : _create_clases,
  "get_class_file" : _get_class_file,
  "add_java_delegates" : _add_java_delegates,
  "get_class_name" : _get_class_name,
  "get_class_package" : _get_class_package,
  "get_process_archive" : _get_process_archive,
  "add_form" : _add_form,
  "createForms" : _createForms,
  "add_xmlns_camunda" : _add_xmlns_camunda
}
