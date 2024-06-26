<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

## features/TaskManager

TaskManager module deals with managing long running tasks in phcode. It handles the `Tasks` dropdown in the status
bar where the user can see all running tasks, monitor its progress and close/pause the execution of the task if
supported by the task.

## renderSpinnerIcon

determines what the spinner icon to show(green-for success), red-fail, blue normal based on the active
tasks in list and renders. IF the active tasks has already  been notified, it wont notify again.

### Parameters

*   `showNormalSpinnerIfNone`  

## TaskObject

Type: [Object][1]

### Properties

*   `show` **function (): void** Shows the task popup in the ui.
*   `close` **function (): void** Closes the task and removes it from the UI.
*   `setTitle` **function ([string][2]): void** Sets the task's title.
*   `getTitle` **function (): [string][2]** Returns the task's title.
*   `setMessage` **function ([string][2]): void** Sets the task's message.
*   `getMessage` **function (): [string][2]** Returns the task's message.
*   `setProgressPercent` **function ([number][3]): void** Sets the task's progress percentage.
*   `getProgressPercent` **function (): [number][3]** Returns the task's current progress percentage.
*   `setFailed` **function (): void** Marks the task as failed.
*   `isFailed` **function (): [boolean][4]** Returns true if the task is marked as failed.
*   `setSucceded` **function (): void** Marks the task as succeeded.
*   `isSucceded` **function (): [boolean][4]** Returns true if the task is marked as succeeded.
*   `showStopIcon` **function ([string][2]): void** Shows the stop icon with an optional tooltip message.
*   `hideStopIcon` **function (): void** Hides the stop icon.
*   `showPlayIcon` **function ([string][2]): void** Shows the play icon with an optional tooltip message.
*   `hidePlayIcon` **function (): void** Hides the play icon.
*   `showPauseIcon` **function ([string][2]): void** Shows the pause icon with an optional tooltip message.
*   `hidePauseIcon` **function (): void** Hides the pause icon.
*   `showRestartIcon` **function ([string][2]): void** Shows the restart (retry) icon with an optional tooltip message.
*   `hideRestartIcon` **function (): void** Hides the restart (retry) icon.
*   `flashSpinnerForAttention` **function (): void** briefly flashes the task spinner icon for attention.

## addNewTask

The addNewTask is designed for adding new tasks to the task management system. This function is central to
managing long-running tasks, providing a way to visually represent task progress, status, and control actions
directly from the UI in the status bar.

### Parameters

*   `taskTitle` **[string][2]** The title of the task. This is a mandatory parameter and is displayed in the UI.
*   `message` **[string][2]** A message or status associated with the task. Displayed as additional information in the UI.
*   `iconHTML` **[string][2]?** Optional HTML string for the task's icon. Used to visually represent the task in the UI. (optional, default `null`)
*   `options` **[Object][1]?** Optional settings and callbacks for the task. (optional, default `{onPauseClick:null,onPlayClick:null,onStopClick:null,onRetryClick:null,onSelect:null,progressPercent:null,noSpinnerNotification:false}`)

    *   `options.onPauseClick` **[Function][5]?** Callback function triggered when the pause button is clicked.
    *   `options.onPlayClick` **[Function][5]?** Callback function triggered when the play button is clicked.
    *   `options.onStopClick` **[Function][5]?** Callback function triggered when the stop button is clicked.
    *   `options.onRetryClick` **[Function][5]?** Callback function triggered when the retry button is clicked.
    *   `options.onSelect` **[Function][5]?** Callback function triggered when the task is selected from the dropdown.
    *   `options.progressPercent` **[number][3]?** Initial progress percentage of the task.
    *   `options.noSpinnerNotification` **[boolean][4]?** If set to true, will not show the task spinners for this task.
        This can be used for silent background tasks where user attention is not needed.

### Examples

```javascript
// Example: Adding a new task with initial progress and attaching event handlers
const task = TaskManager.addNewTask(
  'Data Processing',
  'Processing data...',
  '<i class="fa fa-spinner fa-spin"></i>',
  {
    onPauseClick: () => console.log('Task paused'),
    onPlayClick: () => console.log('Task resumed'),
    onStopClick: () => console.log('Task stopped'),
    onRetryClick: () => console.log('Task retried'),
    onSelect: () => console.log('Task selected'),
    progressPercent: 20
  }
);

// Updating task progress
task.setProgressPercent(60);

// Updating task message
task.setMessage('60% completed');

// Marking task as succeeded
task.setSucceeded();
```

Returns **[TaskObject][6]** Returns a task object with methods for updating the task's state and UI representation,
such as `setProgressPercent`, `setMessage`, `setSucceeded`, `setFailed`, and control visibility methods
like `showStopIcon`, `hideStopIcon`, etc.

[1]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object

[2]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String

[3]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number

[4]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean

[5]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function

[6]: #taskobject
