'use strict';
/**
 * @author Patricio Soto
 */
var Generator = require('yeoman-generator');
var chalk = require('chalk');
var _ = require('lodash');
var fs = require('fs');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var serializer = new XMLSerializer();
var utils = require("../utils");
var path = require('path');
module.exports = class extends Generator {

  /**
   * Constructor for the generator
   * @param {object} args
   * @param {object} opts
   */
  constructor(args, opts) {
    super(args, opts);
    this.doc = null;
    this.forms = [];
    this.elementid = args[0];
    this.sourceRoot(path.join(__dirname,'..','..','templates'));
  }
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

      var element = doc.getElementById(self.elementid);
      if(element == null){
        self.log(chalk.red("Element not found, try to run like this 'yo camunda:form <elementid> '"));
        return ;
      }
      var name = element.getAttribute('name');
      var id = element.getAttribute('id');

      if(name == ''){
        self.log(chalk.yellow("Error : element '"+id+"' whit no name "));
        error = true;
        return;
      }
      self.log(( chalk.green('Element found, the form is generating') ));
      utils.add_form(self,element);
      done();
    });
  }
  /**
   * This method create the forms and atach them to the bpmn
   */
  createForms(){
    utils.createForms(this,false);
  }

  writing(){
    //BPMN FILE
    utils.add_xmlns_camunda(this.doc);
    var xml_bpmn = serializer.serializeToString(this.doc);
    this.fs.copyTpl(
      this.templatePath('blank_file.txt'),
      this.destinationPath(this.destinationPath("src/main/resources/"+this.config.get('bpmFile'))),
      {
        content: xml_bpmn
      }
    );
  }

  end() {
    this.log(chalk.green('Form generated successfully'));
  }
}
