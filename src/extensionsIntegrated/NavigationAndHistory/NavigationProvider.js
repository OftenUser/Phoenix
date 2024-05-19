/*
 * GNU AGPL-3.0 License
 *
 * Copyright (c) 2021 - present core.ai . All rights reserved.
 * Original work Copyright (c) 2017 - 2021 Adobe Systems Incorporated. All rights reserved.
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License
 * for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://opensource.org/licenses/AGPL-3.0.
 *
 */
/*global _ */
/**
 * Manages Editor navigation history to aid back/fwd movement between the edit positions
 * in the active project context. The navigation history is purely in-memory and not
 * persisted to file system when a project is being closed.
 */
define(function (require, exports, module) {


    var Strings                 = require("strings"),
        MainViewManager         = require("view/MainViewManager"),
        DocumentManager         = require("document/DocumentManager"),
        EditorManager           = require("editor/EditorManager"),
        ProjectManager          = require("project/ProjectManager"),
        CommandManager          = require("command/CommandManager"),
        Commands                = require("command/Commands"),
        Menus                   = require("command/Menus"),
        KeyBindingManager       = require("command/KeyBindingManager"),
        FileSystem              = require("filesystem/FileSystem"),
        Metrics                 = require("utils/Metrics");

    var KeyboardPrefs = JSON.parse(require("text!./keyboard.json"));

    // Command constants for navigation history
    const NAVIGATION_JUMP_BACK      = "navigation.jump.back",
        NAVIGATION_JUMP_FWD       = "navigation.jump.fwd",
        _NAVIGATION_RESET_FOR_TESTS       = "navigation.jump.reset.tests";

    // The latency time to capture an explicit cursor movement as a navigation frame
    var MAX_NAV_FRAMES_COUNT = 50;

    let $navback = null,
        $navForward = null,
        $searchNav = null,
        $newProject = null,
        $showInTree = null;

   /**
    * Contains list of most recently known cursor positions.
    * @private
    * @type {Array.<Object>}
    */
    var jumpBackwardStack = [];

   /**
    * Contains list of most recently traversed cursor positions using NAVIGATION_JUMP_BACK command.
    * @private
    * @type {Array.<Object>}
    */
    var jumpForwardStack = [],
        jumpInProgress = false,
        commandJumpBack,
        commandJumpFwd;

   /**
    * Function to check if there are any navigatable frame backward.
    * @private
    */
    function _hasNavBackFrames() {
        return (jumpBackwardStack.length > 0);
    }

    function _hasNavForwardFrames() {
        return jumpForwardStack.length > 0;
    }

    function _setEnableBackNavButton(enabled) {
        if(enabled){
            $navback.removeClass('nav-back-btn-disabled').addClass('nav-back-btn');
        } else {
            $navback.removeClass('nav-back-btn').addClass('nav-back-btn-disabled');
        }
    }

    function _setEnableForwardNavButton(enabled) {
        if(enabled){
            $navForward.removeClass('nav-forward-btn-disabled').addClass('nav-forward-btn');
        } else {
            $navForward.removeClass('nav-forward-btn').addClass('nav-forward-btn-disabled');
        }
    }

   /**
    * Function to enable/disable navigation command based on cursor positions availability.
    * @private
    */
    function _validateNavigationCmds() {
        commandJumpBack.setEnabled(_hasNavBackFrames());
        commandJumpFwd.setEnabled(_hasNavForwardFrames());
        _setEnableBackNavButton(_hasNavBackFrames());
        _setEnableForwardNavButton(_hasNavForwardFrames());
    }

   /**
    * Function to check existence of a file entry, validity of markers
    * @private
    */
    function _validateFrame(entry) {
        var deferred = new $.Deferred(),
            fileEntry = FileSystem.getFileForPath(entry.filePath);

        if (entry.inMem) {
            var indexInWS = MainViewManager.findInWorkingSet(entry.paneId, entry.filePath);
            // Remove entry if InMemoryFile is not found in Working set
            if (indexInWS === -1) {
                deferred.reject();
            } else {
                deferred.resolve();
            }
        } else {
            fileEntry.exists(function (err, exists) {
                if (!err && exists) {
                    // Additional check to handle external modification and mutation of the doc text affecting markers
                    if(entry.nonEditorView){
                        deferred.resolve(); // no markers, file exists, valid
                    } else if (fileEntry._hash !== entry._hash) {
                        deferred.reject();
                    } else if (!entry._validateMarkers()) {
                        deferred.reject();
                    } else {
                        deferred.resolve();
                    }
                } else {
                    deferred.reject();
                }
            });
        }

        return deferred.promise();
    }

   /**
    * Prototype to capture a navigation frame and it's various data/functional attributues
    */
    function NavigationFrame(editor, selectionObj, fileWithoutEditor, fileWithoutEditorPaneID) {
        if(editor) {
            this.cm = editor._codeMirror;
            this.paneId = editor._paneId;
        }
        this.uId = (new Date()).getTime();

        if(editor && fileWithoutEditor) {
            console.error("Both Editor and fileWithoutEditor set for NavigationFrame, only one is expected!!!");
        }
        if(fileWithoutEditor) {
            this.nonEditorView = true;
            this.paneId = fileWithoutEditorPaneID;
        }
        const fileToUse = fileWithoutEditor ? fileWithoutEditor : editor.document.file;
        this.filePath = fileToUse._path;
        this.inMem = fileToUse.constructor.name === "InMemoryFile";
        this._hash = fileToUse._hash;

        this.bookMarkIds = [];
        if(selectionObj){
            this.selections = selectionObj.ranges || [];
            this._createMarkers(selectionObj.ranges);
        } else {
            this.selections = [];
        }
    }

   /**
    * Lifecycle event handler of the editor for which this frame is captured
    */
    NavigationFrame.prototype._handleEditorDestroy = function (editor) {
        this._backupSelectionRanges();
        this._clearMarkers();
        this.cm = null;
        this.bookMarkIds = null;
    };

    /**
    * Function to re-create CM TextMarkers for previously backed up ranges
    * This logic is required to ensure that the captured navigation positions
    * stay valid and contextual even when the actual document text mutates.
    * The mutations which are handled here :
    * -> Addition/Deletion of lines before the captured position
    * -> Addition/Updation of characters in the captured selection
    */
    NavigationFrame.prototype._reinstateMarkers = function (editor) {
        this.cm = editor._codeMirror;
        this.paneId = editor._paneId;
        this._createMarkers(this.selections);
    };


    /**
    * Function to validate an existing frame against a file '_hash' to detect
    * external change so that the frame can be discarded
    */
    NavigationFrame.prototype._validateFileHash = function (file) {
        return this.filePath === file._path ? this._hash === file._hash : true;
    };

   /**
    * Function to create CM TextMarkers for the navigated positions/selections.
    * This logic is required to ensure that the captured navigation positions
    * stay valid and contextual even when the actual document text mutates.
    * The mutations which are handled here :
    * -> Addition/Deletion of lines before the captured position
    * -> Addition/Updation of characters in the captured selection
    */
    NavigationFrame.prototype._createMarkers = function (ranges) {
        if(!ranges){
            return;
        }
        let range,
            rangeStart,
            rangeEnd,
            index,
            bookMark;

        this.bookMarkIds = [];
        for (index in ranges) {
            range = ranges[index];
            rangeStart = range.anchor || range.start;
            rangeEnd = range.head || range.end;
            // 'markText' has to used for a non-zero length position, if current selection is
            // of zero length use bookmark instead.
            if (rangeStart.line === rangeEnd.line && rangeStart.ch === rangeEnd.ch) {
                bookMark = this.cm.setBookmark(rangeStart, rangeEnd);
                this.bookMarkIds.push(bookMark.id);
            } else {
                this.cm.markText(rangeStart, rangeEnd, {className: (this.uId)});
            }
        }
    };

   /**
    * Function to actually convert the CM markers to CM positions which can be used to
    * set selections or cursor positions in Editor.
    */
    NavigationFrame.prototype._backupSelectionRanges = function () {
        if (!this.cm) {
            return;
        }

        var marker,
            selection,
            index;

        // Reset selections first.
        this.selections = [];
        var self = this;

        // Collate only the markers we used to mark selections/cursors
        var markers = this.cm.getAllMarks().filter(function (entry) {
            if (entry.className === self.uId || self.bookMarkIds.indexOf(entry.id) !== -1) {
                return entry;
            }
        });

        // Iterate over CM textmarkers and collate the updated(if?) positions
        for (index in markers) {
            marker = markers[index];
            selection = marker.find();
            if (marker.type === "bookmark") {
                this.selections.push({start: selection, end: selection});
            } else {
                this.selections.push({start: selection.from, end: selection.to});
            }
        }
    };

   /**
    * Function to clean up the markers in cm
    */
    NavigationFrame.prototype._clearMarkers = function () {
        if (!this.cm) {
            return;
        }
        var self = this;

        // clear only the markers we used to mark selections/cursors
        this.cm.getAllMarks().filter(function (entry) {
            if (entry.className === self.uId || self.bookMarkIds.indexOf(entry.id) !== -1) {
                entry.clear();
            }
        });
    };

    /**
    * Function to check if we have valid markers in cm for this frame
    */
    NavigationFrame.prototype._validateMarkers = function () {
        if(this.nonEditorView){
            return true;
        }
        this._backupSelectionRanges();
        return this.selections.length;
    };

   /**
    * Function to actually navigate to the position(file,selections) captured in this frame
    */
    NavigationFrame.prototype.goTo = function () {
        const self = this;
        this._backupSelectionRanges();
        jumpInProgress = true;

        // To ensure we don't reopen the same doc in the last known pane
        // rather bring it to the same pane where user has opened it
        let thisDoc = DocumentManager.getOpenDocumentForPath(this.filePath);
        if (thisDoc && thisDoc._masterEditor) {
            this.paneId = thisDoc._masterEditor._paneId;
        }

        CommandManager.execute(Commands.FILE_OPEN, {fullPath: this.filePath, paneId: this.paneId}).done(function () {
            if(!self.nonEditorView) {
                EditorManager.getCurrentFullEditor().setSelections(self.selections, true);
            }
            _validateNavigationCmds();
        }).always(function () {
            jumpInProgress = false;
        });
    };


   /**
    * Function to capture a non-zero set of selections as a navigation frame.
    * The assumptions behind capturing a frame as a navigation frame are :
    *
    * -> If it's set by user explicitly (using mouse click or jump to definition)
    * -> By clicking on search results
    * -> Change of cursor by keyboard navigation keys or actual edits are not captured.
    *
    * @private
    */
    function _recordJumpDef(event, selectionObj, force) {
        // Don't capture frames if we are navigating or document text is being refreshed(fileSync in progress)
        if (jumpInProgress || (event.target && event.target.document._refreshInProgress)) {
            return;
        }
        // Reset forward navigation stack if we are capturing a new event
        jumpForwardStack = [];
       _validateNavigationCmds();

        // Ensure cursor activity has not happened because of arrow keys or edit
        if (selectionObj.origin !== "+move" && (!window.event || window.event.type !== "input")) {
            let _recordCurrentPos = function () {
                // Check if we have reached MAX_NAV_FRAMES_COUNT
                // If yes, control overflow
                if (jumpBackwardStack.length === MAX_NAV_FRAMES_COUNT) {
                    var navFrame = jumpBackwardStack.shift();
                    navFrame._clearMarkers();
                }

                let currentEditPos = new NavigationFrame(event.target, selectionObj);
                let lastBack = jumpBackwardStack.pop();
                if(lastBack && lastBack!== currentEditPos){
                    // make sure that we don't push in duplicates
                    jumpBackwardStack.push(lastBack);
                }
                jumpBackwardStack.push(currentEditPos);
                _validateNavigationCmds();
            };
            if(force || (event && event.type === 'mousedown') || (event && event.type === "beforeSelectionChange")){
                // We should record nav history immediately is the user changes currently active doc by clicking files
                _recordCurrentPos();
            }
        }
    }

    function _isRangerOverlap(prevStart, prevEnd, curStart, curEnd) {
        if(prevStart>prevEnd){
            let temp = prevStart;
            prevStart = prevEnd;
            prevEnd = temp;
        }
        if(curStart>curEnd){
            let temp = curStart;
            curStart = curEnd;
            curEnd = temp;
        }
        return prevStart <= curEnd && curStart <= prevEnd;
    }

    function _isSimilarSelection(prev, current) {
        if(_.isEqual(prev, current)){
            return true;
        }
        if(prev.length === current.length && current.length === 1){
            let startPrev = prev[0].anchor || prev[0].start,
                endPrev = prev[0].head || prev[0].end,
                startCur = current[0].anchor || current[0].start,
                endCur = current[0].head || current[0].end;
            let psc= startPrev.ch, psl= startPrev.line,
                pec= endPrev.ch, pel= endPrev.line,
                csc= startCur.ch, csl= startCur.line,
                cec= endCur.ch, cel= endCur.line;
            if(_isRangerOverlap(psl, pel, csl, cel)
                && _isRangerOverlap(psc, pec, csc, cec)){
                return true;
            }
        }
        return false;
    }

    function _isSimilarBookmarks(prev, current) {
        if(current.length === 0 && prev.length >= 1){
            // on the same file, if there is no present book mark, then its as good as no book mark
            return true;
        }
        return prev.length === current.length;
    }

    function _getCurrentEditNavFrame() {
        const currentFullEditor = EditorManager.getCurrentFullEditor();
        const currentlyViewedFile = MainViewManager.getCurrentlyViewedFile();
        let currentEditNavFrame;
        if(currentFullEditor){
            currentEditNavFrame = new NavigationFrame(EditorManager.getCurrentFullEditor(),
                {ranges: EditorManager.getCurrentFullEditor()._codeMirror.listSelections()});
        } else if(currentlyViewedFile){
            currentEditNavFrame = new NavigationFrame(null, null,
                currentlyViewedFile, MainViewManager.getActivePaneId());
        }
        return currentEditNavFrame;
    }

   /**
    * Command handler to navigate backward
    */
    function _navigateBack(skipCurrentFile) {
        let deferred = new $.Deferred();
        let navFrame = jumpBackwardStack.pop();
        let currentEditNavFrame = _getCurrentEditNavFrame();

        // Check if the poped frame is the current active frame or doesn't have any valid marker information
        // if true, jump again
        while (navFrame && navFrame === currentEditNavFrame
        ||(navFrame && navFrame.filePath === currentEditNavFrame.filePath
            && _isSimilarSelection(navFrame.selections, currentEditNavFrame.selections)
            && _isSimilarBookmarks(navFrame.bookMarkIds, currentEditNavFrame.bookMarkIds))
        ||(skipCurrentFile && navFrame && navFrame.filePath === currentEditNavFrame.filePath)) {
            navFrame = jumpBackwardStack.pop();
        }

        if (navFrame) {
            // We will check for the file existence now, if it doesn't exist we will jump back again
            // but discard the popped frame as invalid.
            _validateFrame(navFrame).done(function () {
                jumpForwardStack.push(currentEditNavFrame);
                navFrame.goTo();
            }).fail(function () {
                CommandManager.execute(NAVIGATION_JUMP_BACK);
            }).always(function () {
                _validateNavigationCmds();
                deferred.resolve();
            });
        } else {
            jumpBackwardStack.push(currentEditNavFrame);
            deferred.resolve();
        }
        return deferred.promise();
    }

   /**
    * Command handler to navigate forward
    */
    function _navigateForward(skipCurrentFile) {
        let deferred = new $.Deferred();
        let navFrame = jumpForwardStack.pop();
        let currentEditNavFrame = _getCurrentEditNavFrame();

        if (!navFrame) {
            return new $.Deferred().resolve().promise();
        }

        // Check if the poped frame is the current active frame or doesn't have any valid marker information
        // if true, jump again
        while (navFrame === currentEditNavFrame
        ||(navFrame && navFrame.filePath === currentEditNavFrame.filePath
            && _isSimilarSelection(navFrame.selections ,currentEditNavFrame.selections)
            && _isSimilarBookmarks(navFrame.bookMarkIds, currentEditNavFrame.bookMarkIds))
        ||(skipCurrentFile && navFrame && navFrame.filePath === currentEditNavFrame.filePath)) {
            navFrame = jumpForwardStack.pop();
        }

        if(navFrame){
            // We will check for the file existence now, if it doesn't exist we will jump back again
            // but discard the popped frame as invalid.
            _validateFrame(navFrame).done(function () {
                jumpBackwardStack.push(currentEditNavFrame);
                navFrame.goTo();
            }).fail(function () {
                _validateNavigationCmds();
                CommandManager.execute(NAVIGATION_JUMP_FWD);
            }).always(function () {
                _validateNavigationCmds();
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }
       return deferred.promise();
    }

   /**
    * Function to initialize navigation menu items.
    * @private
    */
    function _initNavigationMenuItems() {
        var menu = Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU);
        menu.addMenuItem(NAVIGATION_JUMP_BACK, "", Menus.AFTER, Commands.NAVIGATE_PREV_DOC);
        menu.addMenuItem(NAVIGATION_JUMP_FWD, "", Menus.AFTER, NAVIGATION_JUMP_BACK);
    }

   /**
    * Function to initialize navigation commands and it's keyboard shortcuts.
    * @private
    */
    function _initNavigationCommands() {
        CommandManager.register(Strings.CMD_NAVIGATE_BACKWARD, NAVIGATION_JUMP_BACK, _navigateBack);
        CommandManager.register(Strings.CMD_NAVIGATE_FORWARD, NAVIGATION_JUMP_FWD, _navigateForward);
        if(Phoenix.isTestWindow){
            CommandManager.register("reset nav forward and back for tests", _NAVIGATION_RESET_FOR_TESTS, _clearStacks);
        }
        commandJumpBack = CommandManager.get(NAVIGATION_JUMP_BACK);
        commandJumpFwd = CommandManager.get(NAVIGATION_JUMP_FWD);
        commandJumpBack.setEnabled(false);
        commandJumpFwd.setEnabled(false);
        KeyBindingManager.addBinding(NAVIGATION_JUMP_BACK, KeyboardPrefs[NAVIGATION_JUMP_BACK]);
        KeyBindingManager.addBinding(NAVIGATION_JUMP_FWD, KeyboardPrefs[NAVIGATION_JUMP_FWD]);
        _initNavigationMenuItems();
    }

    /**
    * Create snapshot of last known live markers.
    * @private
    */
    function _backupLiveMarkers(frames, editor) {
        var index, frame;
        for (index in frames) {
            frame = frames[index];
            if (frame.cm === editor._codeMirror) {
                frame._handleEditorDestroy();
            }
        }
    }

    /**
    * Handle Editor destruction to create backup of live marker positions
    * @private
    */
    function _handleEditorCleanup(event, editor) {
        _backupLiveMarkers(jumpBackwardStack, editor);
        _backupLiveMarkers(jumpForwardStack, editor);
    }

    /**
    * Removes all frames from backward navigation stack for the given file only if the file is changed on disk.
    * @private
    */
    function _removeBackwardFramesForFile(file) {
        jumpBackwardStack = jumpBackwardStack.filter(function (frame) {
            return frame._validateFileHash(file);
        });
    }

    /**
    * Removes all frames from forward navigation stack for the given file only if the file is changed on disk.
    * @private
    */
    function _removeForwardFramesForFile(file) {
        jumpForwardStack = jumpForwardStack.filter(function (frame) {
            return frame._validateFileHash(file);
        });
    }

    /**
    * Handles explicit content reset for a document caused by external changes
    * @private
    */
    function _removeFileFromStack(file) {
        if (file) {
            _removeBackwardFramesForFile(file);
            _removeForwardFramesForFile(file);
            _validateNavigationCmds();
        }
    }

    function _clearStacks() {
        jumpBackwardStack = [];
        jumpForwardStack = [];
        _validateNavigationCmds();
    }

    /**
     * Required to make offline markers alive again to track document mutation
     * @private
     */
    function _reinstateMarkers(editor, frames) {
        var index, frame;
        for (index in frames) {
            frame = frames[index];
            if (!frame.cm && frame.filePath === editor.document.file._path) {
                frame._reinstateMarkers(editor);
            }
        }
    }

    /**
     * Function to request a navigation frame creation explicitly. Resets forward stack
     * @private
     */
    function _captureBackFrame(editor) {
        _recordJumpDef({target: editor},
            {ranges: editor._codeMirror.listSelections()},
            true);
    }

    /**
     * Handle Active Editor change to update navigation information
     * @private
     */
    function _handleActiveEditorChange(event, current, previous) {
        if (previous && previous._paneId) { // Handle only full editors
            previous.off("beforeSelectionChange", _recordJumpDef);
            _captureBackFrame(previous);
            _validateNavigationCmds();
        }

        if (current && current._paneId) { // Handle only full editors
            current.off("beforeSelectionChange", _recordJumpDef);
            current.on("beforeSelectionChange", _recordJumpDef);
            current.off("beforeDestroy", _handleEditorCleanup);
            current.on("beforeDestroy", _handleEditorCleanup);
        }
    }

    function _currentFileChanged(_evt) {
        if(jumpInProgress) {
            return;
        }
        // We may not always have an active editor to navigate, For Eg: image/video or other custom views
        // have its onw non-editor views. This section is to handle those cases.
        const activeFullEditor = EditorManager.getCurrentFullEditor();
        if(activeFullEditor){
            return; // this is a text file with codemirror editor, this is handled by _handleActiveEditorChange
        }
        const currentEditNavFrame = _getCurrentEditNavFrame();
        let lastBack = jumpBackwardStack.pop();
        if(lastBack && lastBack!== currentEditNavFrame){
            // make sure that we don't push in duplicates
            jumpBackwardStack.push(lastBack);
        }
        jumpBackwardStack.push(currentEditNavFrame);
        jumpForwardStack = [];
        _validateNavigationCmds();
    }

    function _initHandlers() {
        EditorManager.on("activeEditorChange", _handleActiveEditorChange);
        MainViewManager.on("currentFileChange", _currentFileChanged);
        ProjectManager.on("projectOpen", _clearStacks);
        EditorManager.on("_fullEditorCreatedForDocument", function (event, document, editor) {
            _reinstateMarkers(editor, jumpBackwardStack);
            _reinstateMarkers(editor, jumpForwardStack);
        });
        FileSystem.on("change", function (event, entry) {
            if (entry) {
                _removeFileFromStack(entry);
            }
        });
    }

    function _navigateBackClicked(evt) {
        Metrics.countEvent(Metrics.EVENT_TYPE.UI, "fileNavBar", "back");
        if(_hasNavBackFrames()){
            _navigateBack(evt.shiftKey || (evt.type === "contextmenu"));
        }
        _validateNavigationCmds();
        MainViewManager.focusActivePane();
    }

    function _navigateForwardClicked(evt) {
        Metrics.countEvent(Metrics.EVENT_TYPE.UI, "fileNavBar", "forward");
        if(_hasNavForwardFrames()){
            _navigateForward(evt.shiftKey || (evt.type === "contextmenu"));
        }
        _validateNavigationCmds();
        MainViewManager.focusActivePane();
    }

    function _showInFileTreeClicked() {
        Metrics.countEvent(Metrics.EVENT_TYPE.UI, "fileNavBar", "showInFileTree");
        CommandManager.execute(Commands.NAVIGATE_SHOW_IN_FILE_TREE);
    }

    function _findInFiles() {
        Metrics.countEvent(Metrics.EVENT_TYPE.UI, "fileNavBar", "search");
        CommandManager.execute(Commands.CMD_FIND_IN_FILES);
    }

    function _newProjectClicked() {
        Metrics.countEvent(Metrics.EVENT_TYPE.UI, "fileNavBar", "newProject");
        CommandManager.execute(Commands.FILE_NEW_PROJECT);
    }

    function _getShortcutDisplay(baseStr, commandID) {
        let shortCut = KeyBindingManager.getKeyBindingsDisplay(commandID);
        if(shortCut) {
            return `${baseStr} (${shortCut})`;
        }
        return baseStr;
    }

    function updateTooltips() {
        $navback.attr("title", _getShortcutDisplay(Strings.CMD_NAVIGATE_BACKWARD, NAVIGATION_JUMP_BACK));
        $navForward.attr("title", _getShortcutDisplay(Strings.CMD_NAVIGATE_FORWARD, NAVIGATION_JUMP_FWD));
        $showInTree.attr("title", _getShortcutDisplay(Strings.CMD_SHOW_IN_TREE, Commands.NAVIGATE_SHOW_IN_FILE_TREE));
        $searchNav.attr("title", _getShortcutDisplay(Strings.CMD_FIND_IN_FILES, Commands.CMD_FIND_IN_FILES));
        // new project extension is not yet loaded, so we cant show keyboard shortcut here.
        $newProject.attr("title", Strings.CMD_PROJECT_NEW);
    }

    function _setupNavigationButtons() {
        let $mainNavBarRight = $("#mainNavBarRight");
        let $mainNavBarLeft = $("#mainNavBarLeft");
        $showInTree = $mainNavBarRight.find("#showInfileTree");
        $navback = $mainNavBarRight.find("#navBackButton");
        $navForward = $mainNavBarRight.find("#navForwardButton");
        $searchNav = $mainNavBarRight.find("#searchNav");

        $newProject = $mainNavBarLeft.find("#newProject");
        updateTooltips();
        CommandManager.get(NAVIGATION_JUMP_BACK).on(KeyBindingManager.EVENT_KEY_BINDING_ADDED, updateTooltips);
        CommandManager.get(NAVIGATION_JUMP_FWD).on(KeyBindingManager.EVENT_KEY_BINDING_ADDED, updateTooltips);
        CommandManager.get(Commands.NAVIGATE_SHOW_IN_FILE_TREE).on(KeyBindingManager.EVENT_KEY_BINDING_ADDED, updateTooltips);
        CommandManager.get(Commands.CMD_FIND_IN_FILES).on(KeyBindingManager.EVENT_KEY_BINDING_ADDED, updateTooltips);

        $navback.on("click", _navigateBackClicked);
        $navForward.on("click", _navigateForwardClicked);
        $("#navBackButton").contextmenu(_navigateBackClicked);
        $("#navForwardButton").contextmenu(_navigateForwardClicked);
        $showInTree.on("click", _showInFileTreeClicked);
        $searchNav.on("click", _findInFiles);
        $newProject.on("click", _newProjectClicked);
    }


    function init() {
        _initNavigationCommands();
        _initHandlers();
        _setupNavigationButtons();
    }

    exports.init = init;
});
