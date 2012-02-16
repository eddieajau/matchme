// A dummy header
(function (glob) {
    var version = "!{pkg:version}";
    
    var reExpr = /([\w\.]+)\s*([\>\<\!\=]\=?)\s*([\w\.]+)/,
        reBool = /^(true|false)$/i,
        reFalsyWords = /(undefined|null|false)/g,
        reTruthyWords = /(true)/g,
        reWords = /(\w{2,})/,
        exprLookups = {
            '==': ['equals'],
            '>':  ['gt'],
            '>=': ['gte'],
            '<':  ['lt'],
            '<=': ['lte'],
            '!=': ['equals', 'not']
        },
        wordReplacements = {
            and: '&&',
            or: '||'
        };
    
    function Matcher(target, opts) {
        // initialise options
        this.opts = opts || {};
    
        // initialise members
        this.target = target;
        this.ok = true;
    }
    
    Matcher.prototype = {
        gt: function(prop, value, result) {
            result = result || this;
            result.ok = result.ok && this.target && this.target[prop] > value;
            
            return this;
        },
        
        gte: function(prop, value, result) {
            result = result || this;
            result.ok = result.ok && this.target && this.target[prop] >= value;
            
            return this;
        },
        
        lt: function(prop, value, result) {
            result = result || this;
            result.ok = result.ok && this.target && this.target[prop] < value;
            
            return this;
        },
        
        lte: function(prop, value, result) {
            result = result || this;
            result.ok = result.ok && this.target && this.target[prop] <= value;
            
            return this;
        },
        
        equals: function(prop, value, result) {
            result = result || this;
            
            if (result.ok && this.target) {
                var testVal = this.target[prop],
                    strings = (typeof testVal == 'string' || testVal instanceof String) &&
                        (typeof value == 'string' || value instanceof String);
    
                // if the test value is a string and the value is a string
                if (strings && (! this.opts.caseSensitive)) {
                    result.ok = testVal.toLowerCase() === value.toLowerCase();
                }
                else {
                    result.ok = testVal === value;
                }
            }
            
            return this;
        },
        
        not: function(prop, value, result) {
            // invert the passes state
            result = result || this;
            result.ok = !result.ok;
            
            return this;
        },
        
        query: function(text) {
            var match = reExpr.exec(text);
                
            while (match) {
                var fns = exprLookups[match[2]] || [],
                    result = {
                        ok: fns.length > 0
                    },
                    val1 = parseFloat(match[1]) || match[1],
                    val2 = parseFloat(match[3]) || match[3];
                    
                // if value 2 is a boolean, then parse it
                if (reBool.test(val2)) {
                    val2 = val2 == 'true';
                }
                
                // iterate through the required functions in order and evaluate the result
                for (var ii = 0, count = fns.length; ii < count; ii++) {
                    var evaluator = this[fns[ii]];
                    
                    // if we have the evaluator, then run it
                    if (evaluator) {
                        evaluator.call(this, val1, val2, result);
                    }
                }
                
                text = text.slice(0, match.index) + result.ok + text.slice(match.index + match[0].length);
                match = reExpr.exec(text);
            }
            
            // replace falsy words with 0s and truthy words with 1s
            text = text.replace(reFalsyWords, '0').replace(reTruthyWords, '1');
            
            // find any remaining standalone words
            match = reWords.exec(text);
            while (match) {
                var replacement = wordReplacements[match[0].toLowerCase()];
                
                // if we don't have a replacement for a word then look for the value of the property on the target
                if ((! replacement) && this.target) {
                    replacement = this.target[match[0]];
                }
                
                text = text.slice(0, match.index) + replacement + text.slice(match.index + match[0].length);
                
                // replace falsy words with 0s and truthy words with 1s
                text = text.replace(reFalsyWords, '0').replace(reTruthyWords, '1');
                
                // run the test again
                match = reWords.exec(text);
            }
            
            // evaluate the expression
            this.ok = eval(text);
            
            return this;
        }
    };

    
    function matchme(target, opts, query) {
        var matcher;
        
        // check for no options being supplied (which is the default)
        if (typeof opts == 'string' || opts instanceof String) {
            query = opts;
            opts = {};
        }
        
        // create the matcher
        matcher = new Matcher(target, opts);
        
        if (typeof query != 'undefined') {
            return matcher.query(query).ok;
        }
        else {
            return matcher;
        }
    }
    
    matchme.filter = function(array, query, opts) {
        var matcher;
        
        // if the array has been ommitted (perhaps underscore is being used)
        // then push up arguments and undef the array
        if (typeof array == 'string' || array instanceof String) {
            opts = query;
            query = array;
            array = null;
        };
        
        // create the matcher on a null target
        matcher = new Matcher(null, opts);
        
        if (array) {
            var results = [];
            for (var ii = 0, count = array.length; ii < count; ii++) {
                matcher.target = array[ii];
                if (matcher.query(query).ok) {
                    results[results.length] = array[ii];
                }
            }
            
            return results;
        }
        else {
            return function(target) {
                // update the matcher target
                matcher.target = target;
                
                return matcher.query(query).ok;
            };
        }
    };

    (typeof module != "undefined" && module.exports) ? (module.exports = matchme) : (typeof define != "undefined" ? (define("matchme", [], function() { return matchme; })) : (glob.matchme = matchme));
})(this);