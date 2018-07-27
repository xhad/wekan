Template.boardMenuPopup.events({
  'click .js-rename-board': Popup.open('boardChangeTitle'),
  'click .js-custom-fields'() {
    Sidebar.setView('customFields');
    Popup.close();
  },
  'click .js-open-archives'() {
    Sidebar.setView('archives');
    Popup.close();
  },
  'click .js-change-board-color': Popup.open('boardChangeColor'),
  'click .js-change-language': Popup.open('changeLanguage'),
  'click .js-archive-board ': Popup.afterConfirm('archiveBoard', function() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    currentBoard.archive();
    // XXX We should have some kind of notification on top of the page to
    // confirm that the board was successfully archived.
    FlowRouter.go('home');
  }),
  'click .js-delete-board': Popup.afterConfirm('deleteBoard', function() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    Popup.close();
    Boards.remove(currentBoard._id);
    FlowRouter.go('home');
  }),
  'click .js-outgoing-webhooks': Popup.open('outgoingWebhooks'),
  'click .js-import-board': Popup.open('chooseBoardSource'),
  'click .js-subtask-settings': Popup.open('boardSubtaskSettings'),
});

Template.boardMenuPopup.helpers({
  exportUrl() {
    const params = {
      boardId: Session.get('currentBoard'),
    };
    const queryParams = {
      authToken: Accounts._storedLoginToken(),
    };
    return FlowRouter.path('/api/boards/:boardId/export', params, queryParams);
  },
  exportFilename() {
    const boardId = Session.get('currentBoard');
    return `wekan-export-board-${boardId}.json`;
  },
});

Template.boardChangeTitlePopup.events({
  submit(evt, tpl) {
    const newTitle = tpl.$('.js-board-name').val().trim();
    const newDesc = tpl.$('.js-board-desc').val().trim();
    if (newTitle) {
      this.rename(newTitle);
      this.setDescription(newDesc);
      Popup.close();
    }
    evt.preventDefault();
  },
});

BlazeComponent.extendComponent({
  watchLevel() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return currentBoard && currentBoard.getWatchLevel(Meteor.userId());
  },

  isStarred() {
    const boardId = Session.get('currentBoard');
    const user = Meteor.user();
    return user && user.hasStarred(boardId);
  },

  // Only show the star counter if the number of star is greater than 2
  showStarCounter() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return currentBoard && currentBoard.stars >= 2;
  },

  events() {
    return [{
      'click .js-edit-board-title': Popup.open('boardChangeTitle'),
      'click .js-star-board'() {
        Meteor.user().toggleBoardStar(Session.get('currentBoard'));
      },
      'click .js-open-board-menu': Popup.open('boardMenu'),
      'click .js-change-visibility': Popup.open('boardChangeVisibility'),
      'click .js-watch-board': Popup.open('boardChangeWatch'),
      'click .js-open-archived-board'() {
        Modal.open('archivedBoards');
      },
      'click .js-toggle-board-view'() {
        const currentUser = Meteor.user();
        if (currentUser.profile.boardView === 'board-view-swimlanes') {
          currentUser.setBoardView('board-view-cal');
        } else if (currentUser.profile.boardView === 'board-view-lists') {
          currentUser.setBoardView('board-view-swimlanes');
        } else if (currentUser.profile.boardView === 'board-view-cal') {
          currentUser.setBoardView('board-view-lists');
        }
      },
      'click .js-open-filter-view'() {
        Sidebar.setView('filter');
      },
      'click .js-filter-reset'(evt) {
        evt.stopPropagation();
        Sidebar.setView();
        Filter.reset();
      },
      'click .js-open-search-view'() {
        Sidebar.setView('search');
      },
      'click .js-multiselection-activate'() {
        const currentCard = Session.get('currentCard');
        MultiSelection.activate();
        if (currentCard) {
          MultiSelection.add(currentCard);
        }
      },
      'click .js-multiselection-reset'(evt) {
        evt.stopPropagation();
        MultiSelection.disable();
      },
      'click .js-log-in'() {
        FlowRouter.go('atSignIn');
      },
    }];
  },
}).register('boardHeaderBar');

Template.boardHeaderBar.helpers({
  canModifyBoard() {
    return Meteor.user() && Meteor.user().isBoardMember() && !Meteor.user().isCommentOnly();
  },
});

BlazeComponent.extendComponent({
  backgroundColors() {
    return Boards.simpleSchema()._schema.color.allowedValues;
  },

  isSelected() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return currentBoard.color === this.currentData().toString();
  },

  events() {
    return [{
      'click .js-select-background'(evt) {
        const currentBoard = Boards.findOne(Session.get('currentBoard'));
        const newColor = this.currentData().toString();
        currentBoard.setColor(newColor);
        evt.preventDefault();
      },
    }];
  },
}).register('boardChangeColorPopup');

BlazeComponent.extendComponent({
  onCreated() {
    this.currentBoard = Boards.findOne(Session.get('currentBoard'));
  },

  allowsSubtasks() {
    return this.currentBoard.allowsSubtasks;
  },

  isBoardSelected() {
    return this.currentBoard.subtasksDefaultBoardId === this.currentData()._id;
  },

  isNullBoardSelected() {
    return (this.currentBoard.subtasksDefaultBoardId === null) || (this.currentBoard.subtasksDefaultBoardId === undefined);
  },

  boards() {
    return Boards.find({
      archived: false,
      'members.userId': Meteor.userId(),
    }, {
      sort: ['title'],
    });
  },

  lists() {
    return Lists.find({
      boardId: this.currentBoard._id,
      archived: false,
    }, {
      sort: ['title'],
    });
  },

  hasLists() {
    return this.lists().count() > 0;
  },

  isListSelected() {
    return this.currentBoard.subtasksDefaultBoardId === this.currentData()._id;
  },

  presentParentTask() {
    let result = this.currentBoard.presentParentTask;
    if ((result === null) || (result === undefined)) {
      result = 'no-parent';
    }
    return result;
  },

  events() {
    return [{
      'click .js-field-has-subtasks'(evt) {
        evt.preventDefault();
        this.currentBoard.allowsSubtasks = !this.currentBoard.allowsSubtasks;
        this.currentBoard.setAllowsSubtasks(this.currentBoard.allowsSubtasks);
        $('.js-field-has-subtasks .materialCheckBox').toggleClass('is-checked', this.currentBoard.allowsSubtasks);
        $('.js-field-has-subtasks').toggleClass('is-checked', this.currentBoard.allowsSubtasks);
        $('.js-field-deposit-board').prop('disabled', !this.currentBoard.allowsSubtasks);
      },
      'change .js-field-deposit-board'(evt) {
        let value = evt.target.value;
        if (value === 'null') {
          value = null;
        }
        this.currentBoard.setSubtasksDefaultBoardId(value);
        evt.preventDefault();
      },
      'change .js-field-deposit-list'(evt) {
        this.currentBoard.setSubtasksDefaultListId(evt.target.value);
        evt.preventDefault();
      },
      'click .js-field-show-parent-in-minicard'(evt) {
        const value = evt.target.id || $(evt.target).parent()[0].id ||  $(evt.target).parent()[0].parent()[0].id;
        const options = [
          'prefix-with-full-path',
          'prefix-with-parent',
          'subtext-with-full-path',
          'subtext-with-parent',
          'no-parent'];
        options.forEach(function(element) {
          if (element !== value) {
            $(`#${element} .materialCheckBox`).toggleClass('is-checked', false);
            $(`#${element}`).toggleClass('is-checked', false);
          }
        });
        $(`#${value} .materialCheckBox`).toggleClass('is-checked', true);
        $(`#${value}`).toggleClass('is-checked', true);
        this.currentBoard.setPresentParentTask(value);
        evt.preventDefault();
      },
    }];
  },
}).register('boardSubtaskSettingsPopup');

const CreateBoard = BlazeComponent.extendComponent({
  template() {
    return 'createBoard';
  },

  onCreated() {
    this.visibilityMenuIsOpen = new ReactiveVar(false);
    this.visibility = new ReactiveVar('private');
    this.boardId = new ReactiveVar('');
  },

  visibilityCheck() {
    return this.currentData() === this.visibility.get();
  },

  setVisibility(visibility) {
    this.visibility.set(visibility);
    this.visibilityMenuIsOpen.set(false);
  },

  toggleVisibilityMenu() {
    this.visibilityMenuIsOpen.set(!this.visibilityMenuIsOpen.get());
  },

  onSubmit(evt) {
    evt.preventDefault();
    const title = this.find('.js-new-board-title').value;
    const visibility = this.visibility.get();

    this.boardId.set(Boards.insert({
      title,
      permission: visibility,
    }));

    Swimlanes.insert({
      title: 'Default',
      boardId: this.boardId.get(),
    });

    Utils.goBoardId(this.boardId.get());
  },

  events() {
    return [{
      'click .js-select-visibility'() {
        this.setVisibility(this.currentData());
      },
      'click .js-change-visibility': this.toggleVisibilityMenu,
      'click .js-import': Popup.open('boardImportBoard'),
      submit: this.onSubmit,
      'click .js-import-board': Popup.open('chooseBoardSource'),
    }];
  },
}).register('createBoardPopup');

BlazeComponent.extendComponent({
  template() {
    return 'chooseBoardSource';
  },
}).register('chooseBoardSourcePopup');

(class HeaderBarCreateBoard extends CreateBoard {
  onSubmit(evt) {
    super.onSubmit(evt);
    // Immediately star boards crated with the headerbar popup.
    Meteor.user().toggleBoardStar(this.boardId.get());
  }
}).register('headerBarCreateBoardPopup');

BlazeComponent.extendComponent({
  visibilityCheck() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return this.currentData() === currentBoard.permission;
  },

  selectBoardVisibility() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    const visibility = this.currentData();
    currentBoard.setVisibility(visibility);
    Popup.close();
  },

  events() {
    return [{
      'click .js-select-visibility': this.selectBoardVisibility,
    }];
  },
}).register('boardChangeVisibilityPopup');

BlazeComponent.extendComponent({
  watchLevel() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return currentBoard.getWatchLevel(Meteor.userId());
  },

  watchCheck() {
    return this.currentData() === this.watchLevel();
  },

  events() {
    return [{
      'click .js-select-watch'() {
        const level = this.currentData();
        Meteor.call('watch', 'board', Session.get('currentBoard'), level, (err, ret) => {
          if (!err && ret) Popup.close();
        });
      },
    }];
  },
}).register('boardChangeWatchPopup');

BlazeComponent.extendComponent({
  integrations() {
    const boardId = Session.get('currentBoard');
    return Integrations.find({ boardId: `${boardId}` }).fetch();
  },

  integration(id) {
    const boardId = Session.get('currentBoard');
    return Integrations.findOne({ _id: id, boardId: `${boardId}` });
  },

  events() {
    return [{
      'submit'(evt) {
        evt.preventDefault();
        const url = evt.target.url.value;
        const boardId = Session.get('currentBoard');
        let id = null;
        let integration = null;
        if (evt.target.id) {
          id = evt.target.id.value;
          integration = this.integration(id);
          if (url) {
            Integrations.update(integration._id, {
              $set: {
                url: `${url}`,
              },
            });
          } else {
            Integrations.remove(integration._id);
          }
        } else if (url) {
          Integrations.insert({
            userId: Meteor.userId(),
            enabled: true,
            type: 'outgoing-webhooks',
            url: `${url}`,
            boardId: `${boardId}`,
            activities: ['all'],
          });
        }
        Popup.close();
      },
    }];
  },
}).register('outgoingWebhooksPopup');
