'use strict';
/**
 * @author Patricio Soto
 */
var Generator = require('yeoman-generator');
var beautify = require('gulp-beautify');
var chalk = require('chalk');
var yosay = require('yosay');
var _ = require('lodash');
var fs = require('fs');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var serializer = new XMLSerializer();
var utils = require('../utils');
var beautify = require('gulp-beautify');
var gulpFilter = require('gulp-filter');
var htmlc = require('gulp-html');

module.exports = class extends Generator {

  /**
   * Return the path to file
   * @param {string} classDefinition
   */
  _get_class_file (classDefinition){
     return 'src/main/java/' + _.replace(classDefinition, /\./g, '/') + ".java";
  }
  /**
   * Add java delegate
   * @param {object} classOptions
   * @param {boolean} triggerMessage
   */
  _add_java_delegates(classOptions,triggerMessage){
    if(this.fs.exists(this.destinationPath(this._get_class_file(classOptions.name))) && !this.onlyNews){
      if(!triggerMessage){
        this.javaDelegates.push(classOptions.name);
      }else{
        this.javaDelegatesThatEmitesMessages.push(classOptions.name);
      }

      return true;
    }
    if(!this.fs.exists(this.destinationPath(this._get_class_file(classOptions.name)))){
      if(!triggerMessage){
        this.javaDelegates.push(classOptions.name);
      }else{
        this.javaDelegatesThatEmitesMessages.push(classOptions.name);
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
  _get_class_name (class_definition){
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
  _get_class_package(class_definition){
    var arr = class_definition.split(".");
    arr.pop();
    return arr.join(".");
  }
  /**
   * Returns the process archive name
   */
  _get_process_archive(){
    var arr = this.config.get('bpmFile').split("/");
    arr = arr[arr.length - 1].split(".");
    arr.pop();
    return arr.join(".");
  }
  /**
   * Agregar un formulario en base a un nodo
   * @param {Generator} self
   * @param {Document} node
   */
  _add_form(self,node){
    var inputs = [];
    var extensionElements = node.getElementsByTagName("bpmn:extensionElements");
    if(extensionElements.length>0){
      var camunda_properties = extensionElements[0].getElementsByTagName("camunda:properties");
      if(camunda_properties.length>0){
        var properties = camunda_properties[0].getElementsByTagName("camunda:property");
        for (var k=0;k<properties.length;k++){
          var name = properties[k].getAttribute("name");
          var value = properties[k].getAttribute("value");
          //Input text
          if( name.startsWith("text")){
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
          else if( name.startsWith("list")){
            var required = false;
            if(name.endsWith("*")){
              required = true;
            }
            name = _.replace(name,"*","");
            var arr = name.split(":");
            if(arr.length==2){
              inputs.push({
                type :"list",
                label: _.upperFirst(value),
                list :arr[1],
                name : value,
                required: required
              });
            }else{
              self.log(chalk.yellow("Warning : list without a list -> '"+name));
              continue;
            }
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
            self.log(chalk.yellow("Warning : property type unknown '"+name));
            continue;
          }
        }

      }

    }
    //embedded:app:forms/desarrollo_06/form1.html
    var formKey = node.getAttribute("camunda:formKey");
    if(self.onlyNewsForms){
      if(self.fs.exists(self.destinationPath("src/main/webapp/forms/"+self._get_process_archive()+"/"+_.camelCase(node.getAttribute("name"))+".html"))){
        return;
      }
    }

    if(formKey == ""){
      self.forms.push({
        formKey : "embedded:app:forms/"+self._get_process_archive()+"/"+_.camelCase(node.getAttribute("name"))+".html",
        path : "src/main/webapp/forms/"+self._get_process_archive()+"/"+_.camelCase(node.getAttribute("name"))+".html",
        node : node,
        inputs : inputs
      });
    }else{
      var arr = formKey.split(":app:");
      if(arr.length == 2){
        self.forms.push({
          formKey : formKey,
          path : "src/main/webapp/"+arr[1],
          node : node,
          inputs : inputs
        });
      }else{
        self.log(chalk.red("Error : formKey mal formed -> '"+formKey));
      }
    }

  }

  /**
   * Constructor for the generator
   * @param {object} args
   * @param {object} opts
   */
  constructor(args, opts) {
    super(args, opts);
    this.javaDelegates = [];
    this.javaDelegatesThatEmitesMessages = [];
    this.classNodes = {};
    this.doc = null;
    this.onlyNews = false;
    this.onlyNewsForms = false;
    this.forms = [];
  }

  /**
   * Promting options
   */
  prompting() {
    this.log(yosay('Welcome to ' + chalk.yellow(' Camunda started kit')));
    var done = this.async();
    this.prompt([{
      type: 'input',
      name: 'applicationName',
      message: 'Application name:',
      default: this.config.get('applicationName') || 'App'
    }, {
      type: 'input',
      name: 'groupId',
      message: 'Group ID:',
      default: this.config.get('groupId') || 'org.camunda.processes'
    }, {
      type: 'input',
      name: 'artifactId',
      message: 'Artifact ID:',
      default: this.config.get('artifactId') || 'development'
    }, {
      type: 'input',
      name: 'packaging',
      message: 'Packaging:',
      default: this.config.get('packaging') || 'war'
    }, {
      type: 'confirm',
      name: 'onlyNews',
      message: 'Only new classes?'
    }, {
      type: 'confirm',
      name: 'onlyNewsForms',
      message: 'Only new forms?'
    }, {
      type: 'input',
      name: 'bpmFile',
      message: 'Archivo BPMN:',
      default: this.config.get('bpmFile') || 'process.bpmn'
    }]).then(function (answers) {
      var applicationName = _.replace(answers.applicationName, /\"/g, '');
      this.config.set('groupId', answers.groupId);
      this.config.set('artifactId', answers.artifactId);
      this.config.set('packaging', answers.packaging);
      this.onlyNews = answers.onlyNews;
      this.onlyNewsForms = answers.onlyNewsForms;
      this.config.set('applicationName', applicationName);
      this.config.set('applicationPackage', answers.groupId);
      this.config.set('processPackage', answers.groupId+"."+answers.artifactId);
      this.config.set('bpmFile', answers.bpmFile);
      this.config.set('applicationPackagePath', 'src/main/java/' + _.replace(answers.groupId, /\./g, '/'));
      this.config.set('applicationClassName', _.upperFirst(_.camelCase(answers.applicationName)) + "Application");


      done();
    }.bind(this));
  };
  /**
   * This method read the camunda bpmn file, and maps the classes to be added
   * Also it makes a series of validations and modify the dom
   */
  configuring() {
    var self = this;
    var done = this.async();
    var error = false;
    fs.readFile(self.destinationPath(self.config.get('bpmFile')), 'utf8', function (err, data) {
      if(err){
        self.log(chalk.red("File doesn't exist"));
        return ;
      }
      var doc = new DOMParser().parseFromString(data);
      self.doc = doc;
      var processes = doc.getElementsByTagName("bpmn:process");

      // All SequenceFlow from a XOR wategay must have a condition

      var colaborations = doc.getElementsByTagName("bpmn:collaboration");
      var hashMapColaborations = {}
      if (colaborations && colaborations.length > 0){
        for (var i = 0; i < colaborations.length; i++) {
          var colaboration = colaborations[0];
        }
      }else{
        self.log(chalk.red("Must be at least one pool defined"));
        error = true;
      }

      // Must be at least one process
      if( processes == null ) {
        self.log(chalk.red("Must be at least one process (Tips : Create a pool)"));
        error = true;
      }else{
        for (var i = 0; i < processes.length; i++) {
          var process_id = processes[i].getAttribute('id');
          var nodeOption = null;

          // All intermediateThrowEvent must have a name
          var intermediateThrowEvents = processes[i].getElementsByTagName('bpmn:intermediateThrowEvent');
          for (var j = 0; j < intermediateThrowEvents.length; j++) {
            var intermediateThrowEvent = intermediateThrowEvents[j];
            var camunda_class = intermediateThrowEvent.getAttribute('camunda:class');
            var name = intermediateThrowEvent.getAttribute('name');
            var id = intermediateThrowEvent.getAttribute('id');
            if(name == ''){
              self.log(chalk.red("Error : Intermediate Throw Event '"+id+"' whit no name "));
              error = true;
            }
            //@todo encaple this
            if(camunda_class == ''){
              nodeOption = {
                name: self.config.get("processPackage")+ ".intermediatethrowevents."+ _.upperFirst(_.camelCase(name)),
                value : self.config.get("processPackage")+ ".intermediatethrowevents."+ _.upperFirst(_.camelCase(name)),
                checked: true
              };
            }else{
              nodeOption = {
                name: camunda_class,
                value : camunda_class,
                checked: true
              };
            }
            if(self._add_java_delegates(nodeOption,true) ){
              self.classNodes[nodeOption.name] = intermediateThrowEvent;
            }
          }

          //Iterate over task without a type and alert
          var tasks = processes[i].getElementsByTagName('bpmn:task');
          if (tasks.length > 0 ){
            for (var j = 0; j < tasks.length; j++) {
              var taskId = tasks[j].getAttribute('id');
              var taskName = tasks[j].getAttribute('name');
              self.log(chalk.red("Error : Task '"+taskId+"' without a type"));
              if (taskName == ''){
                self.log(chalk.red("Error : Task '"+taskId+"' without a name"));
              }
              error = true;
            }
          }

          //Iterate over user task
          var userTasks = processes[i].getElementsByTagName('bpmn:userTask');
          for (var j = 0; j < userTasks.length; j++) {
            var userTask = userTasks[j];
            var name = userTask.getAttribute('name');
            var id = userTask.getAttribute('id');
            console.log("_add_form user task: "+name);
            self._add_form(self,userTask);

            if(name == ''){
              self.log(chalk.yellow("Error : User task '"+id+"' whit no name "));
              error = true;
            }
          }

          //Iterate over start events
          var startEvents = processes[i].getElementsByTagName('bpmn:startEvent');
          for (var j = 0; j < startEvents.length; j++) {
            var startEvent = startEvents[j];
            var name = startEvent.getAttribute('name');
            var id = startEvent.getAttribute('id');

            var messageEventDefinition = startEvent.getElementsByTagName("bpmn:messageEventDefinition");
            if(messageEventDefinition.length == 0){
              console.log("_add_form start events : "+name);
              self._add_form(self,startEvent);
            }

            if(name == ''){
              self.log(chalk.yellow("Error : Start event '"+id+"' whit no name "));
              error = true;
            }
          }

          //Iterate over service task
          var serviceTasks = processes[i].getElementsByTagName('bpmn:serviceTask');
          for (var j = 0; j < serviceTasks.length; j++) {
            var serviceTask = serviceTasks[j];
            var name = serviceTask.getAttribute('name');
            var camunda_class = serviceTask.getAttribute('camunda:class');


            var id = serviceTask.getAttribute('id');
            if(name == ''){
              self.log(chalk.red("Error : Service task '"+id+"' whit no name "));
              error = true;
            }
            if(camunda_class == ''){
              nodeOption = {
                name: self.config.get("processPackage")+ ".servicetask." + _.upperFirst(_.camelCase(name)),
                value : self.config.get("processPackage")+ ".servicetask." + _.upperFirst(_.camelCase(name)),
                checked: true
              };
            }else{
              nodeOption = {
                name: camunda_class,
                value : camunda_class,
                checked: true
              };
            }
            if(self._add_java_delegates(nodeOption,false) ){
              self.classNodes[nodeOption.name] = serviceTask;
            }
          }

          //Iterate over send task
          var sendTasks = processes[i].getElementsByTagName('bpmn:sendTask');
          for (var j = 0; j < sendTasks.length; j++) {
            var sendTask = sendTasks[j];
            var camunda_class = sendTask.getAttribute('camunda:class');
            var name = sendTask.getAttribute('name');
            var id = sendTask.getAttribute('id');
            if(name == ''){
              self.log(chalk.red("Error : Send task '"+id+"' whit no name "));
              error = true;
            }
            if(camunda_class == ''){
              nodeOption = {
                name: self.config.get("processPackage")+ ".sendtask." + _.upperFirst(_.camelCase(name)),
                value : self.config.get("processPackage")+ ".sendtask." + _.upperFirst(_.camelCase(name)),
                checked: true
              };
            }else{
              nodeOption = {
                name: camunda_class,
                value : camunda_class,
                checked: true
              };
            }
            if(self._add_java_delegates(nodeOption,true) ){
              self.classNodes[nodeOption.name] = sendTask;
            }
          }

          var exclusiveGatewayOutgoins = [];
          var exclusiveGateways = processes[i].getElementsByTagName('bpmn:exclusiveGateway');
          for (var j = 0; j < exclusiveGateways.length; j++) {
            var exclusiveGateway = exclusiveGateways[j];
            var name = exclusiveGateway.getAttribute('name');
            var id = exclusiveGateway.getAttribute('id');
            if(name == ''){
              self.log(chalk.red("Error : Exclusive Gateway '"+id+"' whit no name "));
              error = true;
            }
            var outgoins = exclusiveGateway.getElementsByTagName("bpmn:outgoing");
            for (var k = 0; k <outgoins.length ; k++){
              var outgoin = outgoins[k];
              if(outgoin.textContent != exclusiveGateway.getAttribute("default")){

                exclusiveGatewayOutgoins.push(outgoin.textContent);
              }
            }
          }
          var sequenceFlows = processes[i].getElementsByTagName("bpmn:sequenceFlow");
          for (var j= 0; j < sequenceFlows.length;j++){
            if( exclusiveGatewayOutgoins.indexOf(sequenceFlows[j].getAttribute("id")) > -1){
              var conditionExpressions = sequenceFlows[j].getElementsByTagName("bpmn:conditionExpression");
              if(conditionExpressions.length == 0){
                self.log(chalk.red("Error : Sequence Flow '"+id+"' whit no condition expresion (scripts no supported yet) "));
                error = true;
              }
            }
          }
        }
      }
      if(!error){
        self.log(yosay( chalk.green('Great, your BPMN file seems to be in proper shape. I\'ll make you some questions') ));
        done();
      }else{
        self.log(yosay( chalk.yellow('Sorry, resolve this issue and try again ') ));
      }
    });
  }

  /**
   * This method create the Java class
   */
  createClases(){
    var self = this;
    var prompts = [];
    if(this.javaDelegates.length > 0){
      prompts.push({
        type : 'checkbox',
        name : 'javaDelegates',
        message : 'Which of these JavaDelegates do you want to create?:',
        choices : this.javaDelegates
      });
    }
    if(this.javaDelegatesThatEmitesMessages.length > 0){
      prompts.push({
        type : 'checkbox',
        name : 'javaDelegatesThatEmitesMessages',
        message : 'Which of these JavaDelegates that emits messages do you want to create?:',
        choices : _.concat(this.javaDelegatesThatEmitesMessages)
      });
    }
    if(prompts.length>0){
      var done = this.async();
      this.prompt(prompts).then(function(answers){
        //Simple Java Delegates
        if ('javaDelegates' in answers)
        for (var i = 0; i < answers['javaDelegates'].length;i++){
          this.classNodes[answers['javaDelegates'][i]].setAttribute("camunda:class",answers['javaDelegates'][i]);
          this.fs.copyTpl(
            this.templatePath('java_delegates.java'),
            this.destinationPath(self._get_class_file(answers['javaDelegates'][i])),
            {
              delegate_package : self._get_class_package(answers['javaDelegates'][i]) ,
              delegate_class_name : self._get_class_name(answers['javaDelegates'][i]) ,
            }
          );

        }

        // Java Delegates That Throw Messages
        if ('javaDelegatesThatEmitesMessages' in answers)
        for (var i = 0; i< answers['javaDelegatesThatEmitesMessages'].length;i++){
          //
          console.log(answers['javaDelegatesThatEmitesMessages'][i]);
          var node = this.classNodes[answers['javaDelegatesThatEmitesMessages'][i]];
          if (node.tagName == 'bpmn:intermediateThrowEvent'){
            var messageEventDefinitions = node.getElementsByTagName("bpmn:messageEventDefinition");
            messageEventDefinitions[0].setAttribute("camunda:class",answers['javaDelegatesThatEmitesMessages'][i]);
          }else{
            node.setAttribute("camunda:class",answers['javaDelegatesThatEmitesMessages'][i]);
          }
          var node = this.classNodes[answers['javaDelegatesThatEmitesMessages'][i]];
          var node_id = node.getAttribute("id");
          var collaboration = self.doc.getElementsByTagName('bpmn:collaboration');
          var messageFlows = collaboration[0].getElementsByTagName("bpmn:messageFlow");
          var message_destination_name = "";
          var is_start_event = false;
          var variables = [];
          var id_instancia_a_ejecutar = "";

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
                this.log(chalk.red("Error : the event/activity "+target.getAttribute("name")+" doesn't have a message definition"));
                self.log(yosay( chalk.yellow('Sorry, resolve this issue and try again ') ));
                return;
              }
              id_instancia_a_ejecutar = "INSTANCE_ID_" + target.parentNode.getAttribute("name");
            }
          }
          // Processes archives
          var properties = node.getElementsByTagName("camunda:property");
          for (var j = 0;j<properties.length; j++){
            variables.push(properties[j].getAttribute("value"));
          }
          //If no destination message, throw error
          if(message_destination_name == ""){
            this.log(chalk.red("Error : you must point your message "+ node.getAttribute("name")+" to some event message"));
            self.log(yosay( chalk.yellow('Sorry, resolve this issue and try again ') ));
            return;
          }
          //Otherwise we copy the processes.xml
          this.fs.copyTpl(
            this.templatePath('java_delegates_throw_message.java'),
            this.destinationPath(self._get_class_file(answers['javaDelegatesThatEmitesMessages'][i])),
            {
              delegate_package : self._get_class_package(answers['javaDelegatesThatEmitesMessages'][i]) ,
              delegate_class_name : self._get_class_name(answers['javaDelegatesThatEmitesMessages'][i]) ,
              variables : variables,
              message_destination_name : message_destination_name,
              id_instancia_a_ejecutar : id_instancia_a_ejecutar,
              is_start_event : is_start_event,
              process_id_name : id_instancia_a_ejecutar
            }
          );
        }
        done();
      }.bind(this));
    }

  }
  /**
   * This method create the forms and atach them to the bpmn
   */
  createForms(){


    var self = this;
    var formsChoices = [];
    var formsChoicesHashs = {};

    for (var i =0;i<this.forms.length;i++){
      var form = this.forms[i];
      formsChoicesHashs[form.formKey] = form;
      formsChoices.push({
        name: form.formKey,
        value : form.formKey,
        checked: false
      });
    }
    if(formsChoices.length>0){
      var done = this.async();
      this.prompt([
      {
        type : 'checkbox',
        name : 'forms',
        message : 'Which of these forms do you want to create?:',
        choices : formsChoices
      }]).then(function(answers){
        for(var i=0; i<answers['forms'].length ; i++){
          var form = formsChoicesHashs[answers['forms'][i]];
          form.node.setAttribute("camunda:formKey",form.formKey);
          for(var j=0;j<form.inputs.length;j++){
            var input = form.inputs[j];
            if(input.type == 'users'){
              var extensionElements = form.node.getElementsByTagName("bpmn:extensionElements");
              var extensionElement = null;
              if(extensionElements.length==0){
                extensionElement = new DOMParser().parseFromString("<bpmn:extensionElements></bpmn:extensionElements>");
                form.node.appendChild(extensionElement);
              }else{
                extensionElement = extensionElements[0];
              }
              var package_user = "org.camunda.groups";
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
              <camunda:executionListener class="org.camunda.groups.Developers" event="start" xmlns:camunda=""/>
              <camunda:executionListener class="org.camunda.groups.Qas" event="start"/>
               */
              self.fs.copyTpl(
                self.templatePath('users.java'),
                self.destinationPath("src/main/java/org/camunda/groups/"+class_name+".java"),
                {
                  package_user: package_user,
                  class_name: class_name,
                  group: group,
                  variable_name : input.list
                }
              );

            }
          }

          console.log(self.destinationPath(form.path));
          self.fs.copyTpl(
            self.templatePath('form.html'),
            self.destinationPath(form.path),
            {
              inputs: form.inputs,
            }
          );
        }
        done();
      });
    }

  }

  /**
   * This method write the main files for a camunda project using MVN
   */
  writing() {
    var done = this.async();
    var self = this;
    this.appStaticFiles = function () {

      //POM xml file
      this.fs.copyTpl(
        this.templatePath('pom.xml'),
        this.destinationPath('pom.xml'),
        {
          groupId: this.config.get('groupId'),
          artifactId: this.config.get('artifactId'),
          packaging: this.config.get('packaging')
        }
      );
      // Application servlet
      this.fs.copyTpl(
        this.templatePath('servlet_process_application.java'),
        this.destinationPath(this.config.get('applicationPackagePath') + '/' + this.config.get('applicationClassName') + '.java'),
        {
          applicationPackage: this.config.get('applicationPackage'),
          applicationName: this.config.get('applicationName'),
          applicationClassName: this.config.get('applicationClassName')
        }
      );
      var process_archive = this._get_process_archive();
      var processesFilePath = this.destinationPath("src/main/resources/META-INF/processes.xml");
      if(this.fs.exists(processesFilePath)){
        fs.readFile(processesFilePath,'utf8',function(err,data){
          if(err){
            self.log(chalk.red(err));
            return;
          }
          var doc = new DOMParser().parseFromString(data);
          var processApplication = doc.getElementsByTagName("process-application");
          var processArchives = doc.getElementsByTagName("process-archive");
          var found = false;
          var processes = [];
          for (var j=0;j< processArchives.length;j++){
            if ( processArchives[j].getAttribute("name") == process_archive ){
              found = true;
            }
            processes.push(processArchives[j].getAttribute("name"));
          }
          if(!found){
            processApplication[0].appendChild(
              new DOMParser().parseFromString(
            '  <process-archive name="'+process_archive+'">\n'+
            '    <process-engine>default</process-engine>\n'+
            '    <properties>\n'+
            '      <property name="history">full</property>\n'+
            '      <property name="isDeleteUponUndeploy">false</property>\n'+
            '      <property name="isScanForProcessDefinitions">true</property>\n'+
            '    </properties>\n'+
            '  </process-archive>\n\n')
            );
            var xml_processes = serializer.serializeToString(doc);
            self.fs.copyTpl(
              self.templatePath('blank_file.txt'),
              self.destinationPath(processesFilePath),
              {
                content: xml_processes
              }
            );
          }
          done();
        });
      }else{
        this.fs.copyTpl(
          this.templatePath('processes.xml'),
          this.destinationPath(processesFilePath),
          {
            processes: [process_archive],
            applicationName: this.config.get('applicationName'),
            applicationClassName: this.config.get('applicationClassName')
          }
        );
        done();
      }

      //BPMN FILE
      var xml_bpmn = serializer.serializeToString(self.doc);
      self.fs.copyTpl(
        self.templatePath('blank_file.txt'),
        self.destinationPath(this.destinationPath("src/main/resources/"+self.config.get('bpmFile'))),
        {
          content: xml_bpmn
        }
      );
      self.fs.copyTpl(
        self.templatePath('blank_file.txt'),
        self.destinationPath(this.destinationPath(self.config.get('bpmFile'))),
        {
          content: xml_bpmn
        }
      );

    }.bind(this);

    this.appStaticFiles();
  }

  conflicts() {

  }

  install() {

  }

  end() {

  }
}
