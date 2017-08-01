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
var path = require('path');
module.exports = class extends Generator {
  /**
   * Constructor for the generator
   * @param {object} args
   * @param {object} opts
   */
  constructor(args, opts) {
    super(args, opts);
    this.javaDelegates = [];
    this.javaDelegatesThatEmitsMessages = [];
    this.classNodes = {};
    this.doc = null;
    this.onlyNews = false;
    this.onlyNewsForms = false;
    this.forms = [];
    if(args.length>0){
      this.config.set('bpmFile',args[0]);
    }
    this.sourceRoot(path.join(__dirname,'..','..','templates'));
  }

  /**
   * Promting options
   */
  prompting() {
    this.log(yosay('Welcome to ' + chalk.green(' Camunda started kit')));
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
    var file = null;
    if(self.fs.exists(self.destinationPath("src/main/resources/"+self.config.get('bpmFile')) )){
      file = self.destinationPath("src/main/resources/"+self.config.get('bpmFile'));
    }else{
      file = self.destinationPath(self.config.get('bpmFile'));
    }
    fs.readFile(file, 'utf8', function (err, data) {
      if(err){
        self.log(chalk.red("File doesn't exist"));
        return ;
      }
      var doc = new DOMParser().parseFromString(data);
      self.doc = doc;
      var processes = doc.getElementsByTagName("bpmn:process");
      var isExecutable = false;
      for (var i = 0; i < processes.length; i++) {
        if(processes[i].getAttribute('isExecutable') == 'true'){
          isExecutable = true;
        }
      }
      if(!isExecutable){
        self.log(chalk.red("You must specify at least one executable process"));
        return ;
      }
      // All SequenceFlow from a XOR wategay must have a condition

      var colaborations = doc.getElementsByTagName("bpmn:collaboration");
      var hashMapColaborations = {}
      if (colaborations && colaborations.length > 0){
        for (var i = 0; i < colaborations.length; i++) {
          var colaboration = colaborations[0];
        }
      }else{
        self.log(chalk.red("It must be defined at least one pool"));
        error = true;
      }

      // Must be at least one process
      if( processes == null || processes.length==0 ) {
        self.log(chalk.red("The process must define at least one process (Tips : Create a pool)"));
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
            if(utils.add_java_delegates(self,nodeOption,true) ){
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
            utils.add_form(self,userTask);

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
              utils.add_form(self,startEvent);
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
            if(utils.add_java_delegates(self,nodeOption,false) ){
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
            if(utils.add_java_delegates(self,nodeOption,true) ){
              self.classNodes[nodeOption.name] = sendTask;
            }
          }

          //Iterate over "end events"
          var endEvents = processes[i].getElementsByTagName('bpmn:endEvent');
          for (var j = 0; j < endEvents.length; j++) {
            var endEvent = endEvents[j];
            var messageEventDefinitions = endEvent.getElementsByTagName("bpmn:messageEventDefinition");
            if(messageEventDefinitions.length>0){
              var camunda_class = endEvent.getAttribute('camunda:class');
              var name = endEvent.getAttribute('name');
              var id = endEvent.getAttribute('id');
              if(name == ''){
                self.log(chalk.red("Error : end Event '"+id+"' whit no name "));
                error = true;
              }
              if(camunda_class == ''){
                nodeOption = {
                  name: self.config.get("processPackage")+ ".endevent." + _.upperFirst(_.camelCase(name)),
                  value : self.config.get("processPackage")+ ".endevent." + _.upperFirst(_.camelCase(name)),
                  checked: true
                };
              }else{
                nodeOption = {
                  name: camunda_class,
                  value : camunda_class,
                  checked: true
                };
              }
              if(utils.add_java_delegates(self,nodeOption,true) ){
                self.classNodes[nodeOption.name] = endEvent;
              }
            }
          }

          var exclusiveGatewayOutgoins = [];
          var exclusiveGateways = processes[i].getElementsByTagName('bpmn:exclusiveGateway');
          for (var j = 0; j < exclusiveGateways.length; j++) {
            var exclusiveGateway = exclusiveGateways[j];
            var id = exclusiveGateway.getAttribute('id');
            var outgoins = exclusiveGateway.getElementsByTagName("bpmn:outgoing");
            if(outgoins.length>1){
              for (var k = 0; k <outgoins.length ; k++){
                var outgoin = outgoins[k];
                if(outgoin.textContent != exclusiveGateway.getAttribute("default")){
                  exclusiveGatewayOutgoins.push(outgoin.textContent);
                }
              }
            }
          }
          var sequenceFlows = processes[i].getElementsByTagName("bpmn:sequenceFlow");
          for (var j= 0; j < sequenceFlows.length;j++){
            if( exclusiveGatewayOutgoins.indexOf(sequenceFlows[j].getAttribute("id")) > -1){
              var conditionExpressions = sequenceFlows[j].getElementsByTagName("bpmn:conditionExpression");
              if(conditionExpressions.length == 0){
                self.log(chalk.red("Error : Sequence Flow '"+sequenceFlows[j].getAttribute("id")+"' whit no condition expresion (scripts no supported yet) "));
                error = true;
              }
            }
          }
        }
      }
      if(!error){
        //self.log(yosay( chalk.green('Great, your BPMN file seems to be in proper shape. I\'ll make you some questions') ));
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
    if(this.javaDelegatesThatEmitsMessages.length > 0){
      prompts.push({
        type : 'checkbox',
        name : 'javaDelegatesThatEmitsMessages',
        message : 'Which of these JavaDelegates that emits messages do you want to create?:',
        choices : _.concat(this.javaDelegatesThatEmitsMessages)
      });
    }
    if(prompts.length>0){
      var done = this.async();
      this.prompt(prompts).then(function(answers){
        // Java Delegates That Throw Messages
        var javaDelegates = ('javaDelegates' in answers)?answers['javaDelegates']:[];
        var javaDelegatesThatEmitsMessages = ('javaDelegatesThatEmitsMessages' in answers)?answers['javaDelegatesThatEmitsMessages']:[];
        utils.create_clases(self,javaDelegates,javaDelegatesThatEmitsMessages);

        done();
      });
    }

  }
  createForms(){
    utils.createForms(this,true);
  }

  /**
   * This method write the main files for a camunda project using MVN
   */
  writing() {
    var self = this;
    var done = self.async();
    self.appStaticFiles = function () {

      //POM xml file
      self.fs.copyTpl(
        self.templatePath('pom.xml'),
        self.destinationPath('pom.xml'),
        {
          groupId: self.config.get('groupId'),
          artifactId: self.config.get('artifactId'),
          packaging: self.config.get('packaging')
        }
      );
      // Application servlet
      self.fs.copyTpl(
        self.templatePath('servlet_process_application.java'),
        self.destinationPath(self.config.get('applicationPackagePath') + '/' + self.config.get('applicationClassName') + '.java'),
        {
          applicationPackage: self.config.get('applicationPackage'),
          applicationName: self.config.get('applicationName'),
          applicationClassName: self.config.get('applicationClassName')
        }
      );
      var process_archive = utils.get_process_archive(self);
      var processesFilePath = self.destinationPath("src/main/resources/META-INF/processes.xml");
      if(self.fs.exists(processesFilePath)){
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
        self.fs.copyTpl(
          self.templatePath('processes.xml'),
          self.destinationPath(processesFilePath),
          {
            processes: [process_archive],
            applicationName: self.config.get('applicationName'),
            applicationClassName: self.config.get('applicationClassName')
          }
        );
        done();
      }

      //BPMN FILE
      utils.add_xmlns_camunda(self.doc);
      var xml_bpmn = serializer.serializeToString(self.doc);
      if(!self.fs.exists(self.destinationPath("src/main/resources/"+self.config.get('bpmFile'))) ){
        if(self.fs.exists(self.destinationPath(self.config.get('bpmFile')))){
          fs.unlink(self.destinationPath(self.config.get('bpmFile')));
          this.log(yosay(chalk.yellow("The bpmn file was moved to src/main/resources/"+this.config.get("bpmFile")+", :)")))
        }
      }
      self.fs.copyTpl(
        self.templatePath('blank_file.txt'),
        self.destinationPath(self.destinationPath("src/main/resources/"+self.config.get('bpmFile'))),
        {
          content: xml_bpmn
        }
      );
      //Package json
      self.fs.copyTpl(
        self.templatePath('package.json'),
        self.destinationPath('package.json'),
        {
          localPath: self.destinationPath(),
          groupId : self.config.get('groupId'),
          artifactId : self.config.get('artifactId'),
          applicationName: self.config.get('applicationName')
        }
      );

      //Middleware Auth
      self.fs.copyTpl(
        self.templatePath('MiddlewareAuth.java'),
        self.destinationPath("src/main/java/org/camunda/auth/"+'MiddlewareAuth.java'),
        {
          localPath: self.destinationPath(),
          groupId : self.config.get('groupId'),
          artifactId : self.config.get('artifactId'),
          applicationName: self.config.get('applicationName')
        }
      );
    };

    self.appStaticFiles();
  }

  conflicts() {

  }

  install() {

  }

  end() {

  }
}
