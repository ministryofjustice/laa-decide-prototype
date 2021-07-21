
validate.validators.conditionallyRequired = function(value, options, key, attributes) {
 var dependent = document.querySelector('[name=' + options.dependentOn.name + ']:checked')
 var other = document.querySelector('[name=' + key)
 console.log(other.value)
 var message = options.message || this.message || "is required";
 if(dependent) {
	  if (dependent.value === options.dependentOn.value) {
      if (other.value === '') {
        return message
      }
	  }
	}
};
