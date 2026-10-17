import { SaxesParser, type SaxesTagNS } from 'saxes';

export interface MultiStatusResponse {
  href: string;
  status: string;
  props: Record<string, string | null>;
}

interface TextCapture {
  depth: number;
  text: string;
}

interface PropertyCapture {
  childNames: string[];
  depth: number;
  hasElementChild: boolean;
  hrefDepth?: number;
  hrefSeen: boolean;
  hrefText: string;
  innerXml: string;
  localName: string;
  text: string;
}

interface ResponseCapture {
  depth: number;
  href: string;
  hrefCapture?: TextCapture;
  hrefSeen: boolean;
  propDepth?: number;
  props: Record<string, string | null>;
  propstatDepth?: number;
  propstatSeen: boolean;
  propSeen: boolean;
  property?: PropertyCapture;
  status: string;
  statusCapture?: TextCapture;
  statusSeen: boolean;
}

const HREF_PROP_NAMES = new Set(['current-user-principal', 'calendar-home-set']);

const escapeText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttribute = (value: string) =>
  escapeText(value).replace(/"/g, '&quot;').replace(/\r/g, '&#13;');

const serializeOpenTag = (tag: SaxesTagNS) => {
  const attributes = Object.values(tag.attributes)
    .map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`)
    .join('');

  return `<${tag.name}${attributes}${tag.isSelfClosing ? '/' : ''}>`;
};

const finishProperty = (property: PropertyCapture): string | null => {
  if (property.localName === 'resourcetype') {
    return property.childNames.join(',');
  }

  if (HREF_PROP_NAMES.has(property.localName)) {
    return property.hrefSeen ? property.hrefText : null;
  }

  return property.hasElementChild ? property.innerXml : property.text;
};

const createResponseCapture = (depth: number): ResponseCapture => ({
  depth,
  href: '',
  hrefSeen: false,
  propSeen: false,
  props: {},
  propstatSeen: false,
  status: '',
  statusSeen: false,
});

const beginResponseTextCaptures = (response: ResponseCapture, tag: SaxesTagNS, depth: number) => {
  if (tag.local === 'href' && !response.hrefSeen && !response.hrefCapture) {
    response.hrefCapture = { depth, text: '' };
  }
  if (tag.local === 'status' && !response.statusSeen && !response.statusCapture) {
    response.statusCapture = { depth, text: '' };
  }
};

const beginPropertyCapture = (response: ResponseCapture, tag: SaxesTagNS, depth: number) => {
  if (!response.propstatSeen && tag.local === 'propstat') {
    response.propstatDepth = depth;
    response.propstatSeen = true;
    return;
  }

  if (response.propstatDepth !== undefined && !response.propSeen && tag.local === 'prop') {
    response.propDepth = depth;
    response.propSeen = true;
    return;
  }

  if (response.propDepth !== undefined && depth === response.propDepth + 1) {
    response.property = {
      childNames: [],
      depth,
      hasElementChild: false,
      hrefSeen: false,
      hrefText: '',
      innerXml: '',
      localName: tag.local,
      text: '',
    };
  }
};

const appendPropertyElement = (property: PropertyCapture, tag: SaxesTagNS, depth: number) => {
  if (!property.hasElementChild) {
    property.innerXml = escapeText(property.text);
  }
  property.hasElementChild = true;
  property.innerXml += serializeOpenTag(tag);

  if (depth === property.depth + 1) {
    property.childNames.push(tag.local);
  }
  if (
    HREF_PROP_NAMES.has(property.localName) &&
    property.hrefDepth === undefined &&
    tag.local === 'href'
  ) {
    property.hrefDepth = depth;
    property.hrefSeen = true;
  }
};

const handleResponseOpenTag = (response: ResponseCapture, tag: SaxesTagNS, depth: number) => {
  beginResponseTextCaptures(response, tag, depth);

  if (response.property && depth > response.property.depth) {
    appendPropertyElement(response.property, tag, depth);
    return;
  }

  beginPropertyCapture(response, tag, depth);
};

const closePropertyCapture = (response: ResponseCapture, tag: SaxesTagNS, depth: number) => {
  const property = response.property;
  if (!property) return;

  if (depth > property.depth && !tag.isSelfClosing) {
    property.innerXml += `</${tag.name}>`;
  }
  if (property.hrefDepth === depth) {
    property.hrefDepth = undefined;
  }
  if (property.depth === depth) {
    response.props[property.localName] = finishProperty(property);
    response.property = undefined;
  }
};

const closeResponseTextCaptures = (response: ResponseCapture, depth: number) => {
  if (response.hrefCapture?.depth === depth) {
    response.href = response.hrefCapture.text;
    response.hrefCapture = undefined;
    response.hrefSeen = true;
  }
  if (response.statusCapture?.depth === depth) {
    response.status = response.statusCapture.text;
    response.statusCapture = undefined;
    response.statusSeen = true;
  }
};

/**
 * parse a WebDAV multistatus response without constructing a browser DOM tree
 */
export const parseMultiStatusXml = (xml: string): MultiStatusResponse[] => {
  const responses: MultiStatusResponse[] = [];
  const parser = new SaxesParser({ xmlns: true });
  const stack: SaxesTagNS[] = [];
  let currentResponse: ResponseCapture | undefined;
  let documentRoot: string | undefined;
  let parseError: Error | undefined;

  parser.on('error', (error) => {
    parseError ??= error;
  });

  parser.on('opentag', (tag) => {
    const depth = stack.length;

    if (depth === 0) {
      documentRoot = tag.local;
    }

    if (!currentResponse && tag.local === 'response') {
      currentResponse = createResponseCapture(depth);
    } else if (currentResponse) {
      handleResponseOpenTag(currentResponse, tag, depth);
    }

    stack.push(tag);
  });

  const appendText = (text: string, innerXmlText: string) => {
    if (!currentResponse) return;

    const response = currentResponse;
    if (response.hrefCapture) response.hrefCapture.text += text;
    if (response.statusCapture) response.statusCapture.text += text;

    const property = response.property;
    if (!property) return;

    property.text += text;
    if (property.hasElementChild) {
      property.innerXml += innerXmlText;
    }
    if (property.hrefDepth !== undefined && stack.length - 1 >= property.hrefDepth) {
      property.hrefText += text;
    }
  };

  parser.on('text', (text) => appendText(text, escapeText(text)));
  parser.on('cdata', (text) => appendText(text, `<![CDATA[${text}]]>`));

  parser.on('comment', (comment) => {
    const property = currentResponse?.property;
    if (property && stack.length - 1 > property.depth) {
      property.innerXml += `<!--${comment}-->`;
    }
  });

  parser.on('closetag', (tag) => {
    const depth = stack.length - 1;
    const response = currentResponse;

    if (response) {
      closePropertyCapture(response, tag, depth);
      closeResponseTextCaptures(response, depth);
      if (response.propDepth === depth) {
        response.propDepth = undefined;
      }
      if (response.propstatDepth === depth) {
        response.propstatDepth = undefined;
      }

      if (response.depth === depth) {
        responses.push({
          href: response.href,
          status: response.status,
          props: response.props,
        });
        currentResponse = undefined;
      }
    }

    stack.pop();
  });

  try {
    parser.write(xml).close();
  } catch (error) {
    parseError ??= error instanceof Error ? error : new Error(String(error));
  }

  if (parseError) {
    throw new Error('Invalid CalDAV XML response.');
  }
  if (documentRoot !== 'multistatus') {
    throw new Error('Invalid CalDAV multistatus response.');
  }

  return responses;
};
