/*global define*/
define([
    'underscore',
    'backbone',
    'collections/pageable',
    'migrations/note',
    'models/note',
    'fuse',
    'indexedDB'
], function(_, Backbone, PageableCollection, NotesDB, Note, Fuse) {
    'use strict';

    var Notes = PageableCollection.extend({
        model: Note,

        database  : NotesDB,
        storeName : 'notes',

        state: {
            pageSize     : 10,
            firstPage    : 0,
            currentPage  : 0,
            totalRecords : 0,
            comparator   : {'created' : 'desc', 'isFavorite' : 'desc'}
        },

        conditions: {
            active   : {trash      : 0},
            favorite : {isFavorite : 1, trash : 0},
            trashed  : {trash      : 1},

            notebook : function(args) {
                return {notebookId: args.query, trash: 0};
            }
        },

        initialize: function() {
        },

        comparator: function(model) {
            return -model.get('created');
        },

        filterList: function(filter, options) {
            filter = filter || 'active';
            var cond = this.conditions[filter],
                res;

            if (cond) {
                cond = (typeof cond === 'function' ? cond(options) : cond);
                res = this.where(cond);
            }
            else {
                res = this[filter + 'Filter'](options.query);
            }

            return this.reset(res);
        },

        /**
         * Returns notes to which a specified tag was attached.
         */
        tagFilter: function(tagName) {
            return this.filter(function(note) {
                if (note.get('tags').length > 0) {
                    return (
                        (_.indexOf(note.get('tags'), tagName) !== -1) &&
                        note.get('trash') === 0
                    );
                }
            });
        },

        /**
         * Filter: only unencrypted, JSON data probably encrypted data
         */
        getUnEncrypted: function() {
            return this.filter(function(note) {
                try {
                    JSON.parse(note.get('title'));
                    return false;
                } catch (e) {
                    return true;
                }
            });
        },

        /**
         * Search
         */
        searchFilter: function(letters) {
            if (letters === '') {
                return this;
            }

            var pattern = new RegExp(letters, 'gim'),
                data;

            return this.filter(function(model) {
                data = model.decrypt();
                pattern.lastIndex = 0;
                return pattern.test(data.title) || pattern.test(data.content);
            });
        },

        fuzzySearch: function(text) {
            var fuse = new Fuse(this.fullCollection.models, {
                keys  : ['title'],
                getFn : function(obj, path) {
                    return obj.get(path);
                }
            });
            return fuse.search(text);
        }

    });

    return Notes;
});
