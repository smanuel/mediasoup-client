import Logger from './Logger';
import EnhancedEventEmitter from './EnhancedEventEmitter';
import { InvalidStateError } from './errors';
import { RtpParameters } from './types';

export interface ConsumerOptions
{
	id: string;
	producerId: string;
	kind: 'audio' | 'video';
	rtpParameters: RtpParameters;
	appData?: object;
}

const logger = new Logger('Consumer');

export class Consumer extends EnhancedEventEmitter
{
	// Id.
	private _id: string;

	// Local id.
	private _localId: string;

	// Associated Producer id.
	private _producerId: string;

	// Closed flag.
	private _closed: boolean;

	// Remote track.
	private _track: MediaStreamTrack;

	// RTP parameters.
	private _rtpParameters: RtpParameters;

	// Paused flag.
	private _paused: boolean;

	// App custom data.
	private _appData: object;

	/**
	 * @private
	 *
	 * @emits transportclose
	 * @emits trackended
	 * @emits @getstats
	 * @emits @close
	 */
	constructor(
		{
			id,
			localId,
			producerId,
			track,
			rtpParameters,
			appData
		}:
		{
			id: string;
			localId: string;
			producerId: string;
			track: MediaStreamTrack;
			rtpParameters: RtpParameters;
			appData: object;
		}
	)
	{
		super(logger);

		this._id = id;

		this._localId = localId;

		this._producerId = producerId;

		this._closed = false;

		this._track = track;

		this._rtpParameters = rtpParameters;

		this._paused = !track.enabled;

		this._appData = appData;

		this._onTrackEnded = this._onTrackEnded.bind(this);

		this._handleTrack();
	}

	/**
	 * Consumer id.
	 *
	 * @returns {String}
	 */
	get id(): string
	{
		return this._id;
	}

	/**
	 * Local id.
	 *
	 * @private
	 * @returns {String}
	 */
	get localId(): string
	{
		return this._localId;
	}

	/**
	 * Associated Producer id.
	 *
	 * @returns {String}
	 */
	get producerId(): string
	{
		return this._producerId;
	}

	/**
	 * Whether the Consumer is closed.
	 *
	 * @returns {Boolean}
	 */
	get closed(): boolean
	{
		return this._closed;
	}

	/**
	 * Media kind.
	 *
	 * @returns {String}
	 */
	get kind(): string
	{
		return this._track.kind;
	}

	/**
	 * The associated track.
	 *
	 * @returns {MediaStreamTrack}
	 */
	get track(): MediaStreamTrack
	{
		return this._track;
	}

	/**
	 * RTP parameters.
	 *
	 * @returns {RTCRtpParameters}
	 */
	get rtpParameters(): RtpParameters
	{
		return this._rtpParameters;
	}

	/**
	 * Whether the Consumer is paused.
	 *
	 * @returns {Boolean}
	 */
	get paused(): boolean
	{
		return this._paused;
	}

	/**
	 * App custom data.
	 *
	 * @returns {Object}
	 */
	get appData(): object
	{
		return this._appData;
	}

	/**
	 * Invalid setter.
	 */
	set appData(appData) // eslint-disable-line no-unused-vars
	{
		throw new Error('cannot override appData object');
	}

	/**
	 * Closes the Consumer.
	 */
	close(): void
	{
		if (this._closed)
			return;

		logger.debug('close()');

		this._closed = true;

		this._destroyTrack();

		this.emit('@close');
	}

	/**
	 * Transport was closed.
	 *
	 * @private
	 */
	transportClosed(): void
	{
		if (this._closed)
			return;

		logger.debug('transportClosed()');

		this._closed = true;

		this._destroyTrack();

		this.safeEmit('transportclose');
	}

	/**
	 * Get associated RTCRtpReceiver stats.
	 *
	 * @async
	 * @returns {RTCStatsReport}
	 * @throws {InvalidStateError} if Consumer closed.
	 */
	async getStats(): Promise<any>
	{
		if (this._closed)
			throw new InvalidStateError('closed');

		return this.safeEmitAsPromise('@getstats');
	}

	/**
	 * Pauses receiving media.
	 */
	pause(): void
	{
		logger.debug('pause()');

		if (this._closed)
		{
			logger.error('pause() | Consumer closed');

			return;
		}

		this._paused = true;
		this._track.enabled = false;
	}

	/**
	 * Resumes receiving media.
	 */
	resume(): void
	{
		logger.debug('resume()');

		if (this._closed)
		{
			logger.error('resume() | Consumer closed');

			return;
		}

		this._paused = false;
		this._track.enabled = true;
	}

	/**
	 * @private
	 */
	_onTrackEnded(): void
	{
		logger.debug('track "ended" event');

		this.safeEmit('trackended');
	}

	/**
	 * @private
	 */
	_handleTrack(): void
	{
		this._track.addEventListener('ended', this._onTrackEnded);
	}

	/**
	 * @private
	 */
	_destroyTrack(): void
	{
		try
		{
			this._track.removeEventListener('ended', this._onTrackEnded);
			this._track.stop();
		}
		catch (error)
		{}
	}
}
