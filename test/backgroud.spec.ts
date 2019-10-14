import {
  search,
  showNotification,
  scan,
  createContextMenuErrorHandler,
  createContextMenus,
} from "../src/background";

import "mocha";
import { browser } from "webextension-polyfill-ts";
import { browserMock } from "./browserMock";
import { Command } from "../src/lib/command";
import { expect } from "chai";
import sinon = require("sinon");

const sandbox = sinon.createSandbox();

describe("Background script", () => {
  afterEach(() => {
    browserMock.reset();
    sandbox.restore();
  });

  describe("#showNotification", () => {
    it("should call chrome.notifications.create()", () => {
      showNotification("test");
      browserMock.notifications.create.assertCalls([
        [
          {
            iconUrl: "./icons/48.png",
            message: "test",
            title: "Mitaka",
            type: "basic",
          },
        ],
      ]);
    });
  });

  describe("#search", () => {
    context("when given a valid input", () => {
      it("should call chrome.tabs.create()", () => {
        const command = new Command(
          "Search https://github.com as a url on Urlscan"
        );
        search(command);
        browserMock.tabs.create.assertCalls([
          [
            {
              url: "https://urlscan.io/search/#%22https%3A%2F%2Fgithub.com%22",
            },
          ],
        ]);
      });
    });
  });

  describe("#scan", () => {
    context("when chrome.storage.sync.get returns a valid config", () => {
      beforeEach(() => {
        sandbox
          .stub(browserMock.storage.sync, "get")
          .withArgs("apiKeys")
          .resolves({
            apiKeys: {
              urlscanApiKey: "test",
              virusTotalApiKey: "test",
            },
          });
      });

      it("should call chrome.tabs.create()", async () => {
        const command = new Command(
          "Scan https://www.wikipedia.org/ as a url on Urlscan"
        );
        const commandStub: sinon.SinonStub<any, any> = sandbox
          .stub(command, "scan")
          .withArgs({
            urlscanApiKey: "test",
            virusTotalApiKey: "test",
          });
        commandStub.returns(
          "https://urlscan.io/entry/ac04bc14-4efe-439d-b356-8384843daf75/"
        );

        await scan(command);
        browserMock.tabs.create.assertCalls([
          [
            {
              url:
                "https://urlscan.io/entry/ac04bc14-4efe-439d-b356-8384843daf75/",
            },
          ],
        ]);
      });
    });

    context("when chrome.storage.sync.get returns an invalid config", () => {
      beforeEach(() => {
        sandbox
          .stub(browserMock.storage.sync, "get")
          .withArgs("apiKeys")
          .resolves({ apiKeys: {} });
      });

      it("should not call chrome.tabs.create()", async () => {
        const command = new Command(
          "Scan https://www.wikipedia.org/ as a url on Urlscan"
        );

        await scan(command);
        browserMock.tabs.create.assertCalls([]);
      });
    });
  });

  describe("#createContextMenuErrorHandler", () => {
    beforeEach(() => {
      const stub = sandbox.stub(console, "error");
      stub.withArgs("test");
    });

    context("when set an error in chrome.runtime.lastError", () => {
      it("should output via console.error", () => {
        browser.runtime.lastError = {
          message: "test",
        };

        createContextMenuErrorHandler();
        expect((console.error as sinon.SinonStub).withArgs("test").calledOnce)
          .to.be.true;
      });
    });

    context("when not set an error in chrome.runtime.lastError", () => {
      it("should not output via console.error", () => {
        browser.runtime.lastError = undefined;

        createContextMenuErrorHandler();
        expect((console.error as sinon.SinonStub).notCalled).to.be.true;
      });
    });
  });

  describe("#createContextMenus", () => {
    context("when not given a searcherState", () => {
      it("should call chrome.contextMenus.create", async () => {
        await createContextMenus({ selection: "test" }, {});

        browserMock.contextMenus.create.assertCalls([
          [
            {
              contexts: ["selection"],
              id: "Search test as a text on Censys",
              title: "Search this text on Censys",
            },
            createContextMenuErrorHandler,
          ],
          [
            {
              contexts: ["selection"],
              id: "Search test as a text on PublicWWW",
              title: "Search this text on PublicWWW",
            },
            createContextMenuErrorHandler,
          ],
        ]);
      });
    });

    context("when given a searcherState", () => {
      it("should call chrome.contextMenus.create", async () => {
        await createContextMenus(
          { selection: "test" },
          {
            Censys: false,
          }
        );

        browserMock.contextMenus.create.assertCalls([
          [
            {
              contexts: ["selection"],
              id: "Search test as a text on PublicWWW",
              title: "Search this text on PublicWWW",
            },
            createContextMenuErrorHandler,
          ],
        ]);
      });
    });
  });
});