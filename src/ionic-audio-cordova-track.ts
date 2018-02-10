import {IAudioTrack, STATUS_MEDIA, Imessage} from './ionic-audio-interfaces';
import {Injectable, NgZone} from '@angular/core';
import {Observable} from 'rxjs/Observable';


declare let Media: any;

/**
 * Cordova Media audio track
 *
 * @export
 * @class CordovaAudioTrack
 * @constructor
 * @implements {IAudioTrack}
 */
@Injectable()
export class CordovaAudioTrack implements IAudioTrack {
  private audio: any;
  public isPlaying: boolean = false;
  public isFinished: boolean = false;
  private _progress: number = 0;
  private _progressEventSend :boolean =false;
  private _completed: number = 0;
  private _duration: number;
  private _id: number;
  private _isLoading: boolean;
  private _hasLoaded: boolean;
  private _timer: any;
  private _ngZone: NgZone;
  private _observer: Observable<Imessage>;
  private _nextCallbackObvserver = function(message: Imessage){
    //not subscribe yet
  };
  private _completeCallbackObvserver = function(){
    //not subscribe yet
  };;
  private _listPosition = [0 ,0 ,0];

  constructor(public src: string) {
    if (window['cordova'] === undefined || window['Media'] === undefined) {
      console.log('Cordova Media is not available');
      return;
    };
    this._ngZone = new NgZone({enableLongStackTrace: false});
    this.createAudio();
    // not necesari with cordova-background-mode
    // document.addEventListener("resume", ()=>{this.detectPaused();
    //   setTimeout(()=>{this.detectPaused()},400);
    //   setTimeout(()=>{this.detectPaused()},800);
    //   setTimeout(()=>{this.detectPaused()},12000);
    //   this.startTimer();}, false);
  }

  private createAudio() {
    this._observer = new Observable<Imessage>(observer => {
      this._nextCallbackObvserver = (message: Imessage) => {
        observer.next(message);
      };

      this._completeCallbackObvserver = () => {
        observer.complete()
      }
    });

    this.audio = new Media(this.src, () => {
      console.log('Finished playback');
      this.stopTimer();
      this._ngZone.run(()=>{
        this._progress = 0;
        this._completed = 0;
        this._hasLoaded = false;
        this.isFinished = true;
        this.isPlaying = false;
      });
      this.destroy();  // TODO add parameter to control whether to release audio on stop or finished
    }, (err) => {
      this._nextCallbackObvserver({value: err, status:STATUS_MEDIA.MEDIA_ERROR});
      console.log(`Audio error => track ${this.src}`, err);
    }, (status) => {
      this._ngZone.run(()=>{
        console.log(`CordovaAudioTrack:satatus:`,status);
        switch (status) {
          case Media.MEDIA_STARTING:
            console.log(`Loaded track ${this.src}`);
            this._hasLoaded = true;
            break;
          case Media.MEDIA_RUNNING:
            console.log(`Playing track ${this.src}`);
            this.isPlaying = true;
            this._isLoading = false;
            break;
          case Media.MEDIA_PAUSED:
            this.isPlaying = false;
            break
          case Media.MEDIA_STOPPED:
            this.isPlaying = false;
            break;
        }
      });
      this._nextCallbackObvserver({value: this.audio, status:status});
    });
  }

  private startTimer() {
    this._timer = setInterval(() => {
      if (this._duration===undefined) {
        let duration: number = this.audio.getDuration();
        (duration > 0) && (this._duration = Math.round(this.audio.getDuration()*100)/100);
      }

      this.audio.getCurrentPosition((position) => this._ngZone.run(()=>{
            if (position > -1) {
              this._progress = Math.round(position*100)/100;
              this.detectPaused();
              this._completed = this._duration > 0 ? Math.round(this._progress / this._duration * 100)/100 : 0;
              if (this._duration > 0 && this._progress > 0 && !this._progressEventSend){
                this._progressEventSend = true;
                this._nextCallbackObvserver({value: this.audio, status:STATUS_MEDIA.MEDIA_PROGRESS_ENABLE}); 
              }
            }
        }), (e) => {
            console.log("Error getting position", e);
        }
      );
    }, 1000);
  }

  private stopTimer() {
    clearInterval(this._timer);
  }
  
  private detectPaused(){
    let lastPosition = this._progress;
    if (lastPosition != 0 && this._listPosition[0] == lastPosition && this._listPosition[1] == lastPosition && this._listPosition[2] == lastPosition){
      this.pause()
    }
    this._listPosition[0] = this._listPosition[1];
    this._listPosition[1] = this._listPosition[2];
    this._listPosition[2] = lastPosition;
  }

  /** public members */

  /**
 * Gets the track id
 *
 * @property id
 * @type {number}
 */
  public get id() : number {
    return this._id;
  }

  /**
 * Sets the track id
 *
 * @property id
 */
  public set id(v : number) {
    this._id = v;
  }

  /**
 * Gets the track duration, or -1 if it cannot be determined
 *
 * @property duration
 * @readonly
 * @type {number}
 */
  public get duration() : number {
    return this._duration;
  }

  /**
 * Gets current track time (progress)
 *
 * @property progress
 * @readonly
 * @type {number}
 */
  public get progress() : number {
    return this._progress;
  }

  /**
 * Gets current track progress as a percentage
 *
 * @property completed
 * @readonly
 * @type {number}
 */
  public get completed() : number {
    return this._completed;
  }

/**
 * Gets any errors logged by HTML5 audio
 *
 * @property error
 * @readonly
 * @type {MediaError}
 */
  public get error() : MediaError {
    return this.audio.error;
  }

  /**
 * Gets a boolean value indicating whether the current source can be played
 *
 * @property canPlay
 * @readonly
 * @type {boolean}
 */
  public get canPlay() : boolean {
    return true;
  }

  /**
 * Gets a boolean value indicating whether the track is in loading state
 *
 * @property isLoading
 * @readonly
 * @type {boolean}
 */
  public get isLoading() : boolean {
    return this._isLoading;
  }

  /**
 * Gets a boolean value indicating whether the track has finished loading
 *
 * @property hadLoaded
 * @readonly
 * @type {boolean}
 */
  public get hasLoaded() : boolean {
    return this._hasLoaded;
  }

  /**
   * Gets observer for events of media
   * @property subscribe
   * @readonly
   * @type {Observable}
    */

  subscribe(): Observable<any>{
    return this._observer;
  }
  
  /**
 * Plays current track
 *
 * @method play
 */
  play() {
    if (!this.audio) {
      this.createAudio();
    }

    if (!this._hasLoaded) {
      console.log(`Loading track ${this.src}`);
      this._isLoading = true;
    }

    this.audio.play();
    this.startTimer();
  }

  /**
 * Pauses current track
 *
 * @method pause
 */
  pause() {
    if (!this.isPlaying) return;
    console.log(`Pausing track ${this.src}`);
    this.audio.pause();
    this.stopTimer();
  }

  /**
 * Stops current track and releases audio
 *
 * @method stop
 */
  stop() {
    this.audio.stop();  // calls Media onSuccess callback
  }

  /**
 * Seeks to a new position within the track
 *
 * @method seekTo
 * @param {number} time the new position (milliseconds) to seek to
 */
  seekTo(time: number) {
    // Cordova Media reports duration and progress as seconds, so we need to multiply by 1000
    this.audio.seekTo(time*1000);
    this._nextCallbackObvserver({value: time, status:STATUS_MEDIA.MEDIA_SEEKTO});
  }

  /**
   * Releases audio resources
   *
   * @method destroy
   */
  destroy() {
    this.audio.release();
    console.log(`Released track ${this.src}`);
  }
}
